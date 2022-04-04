from math import cos,tan,sin,asin,atan,acos, sqrt, degrees,radians,pi

class Servo:
    def __init__(self,ID, uart, offset = 0, invert = False, servo_range = 170):
        self.offset = offset
        self.ID = ID
        self.invert = invert
        self.uart = uart
        self.servo_range  = servo_range
    def angleToPulse(self,pos):
        angle = pos + self.offset
        angle = self.servo_range-angle if self.invert else angle
        if angle < 0:
            print("Too small angle on servo "+str(self.ID)+":"+str(angle))  
            angle = 0
        elif angle > self.servo_range:
            print("Too large angle on servo "+str(self.ID)+":"+str(angle))  
            angle = self.servo_range
        return (int(angle*2000/180) + 500)
    def setPos(self,angle,time):
        command = "#"+str(self.ID)+"P"+str(self.angleToPulse(angle))+"T"+ str(time)+"\r"       
        self.uart.write(command)
        #print (command)
    def getCommand(self,angle):
        return("#"+str(self.ID)+"P"+str(self.angleToPulse(angle)))
    def getConfig(self):
        return "offset:" + str(self.offset) +",ID:"+str(self.ID)+",invert:"+str(self.invert)+",servo_range:"+str(self.servo_range)+",uart:"+str(self.uart)
    def getID(self): return self.ID
    
class Leg: #quadruped
    
    L1 = 24.4 #distance from abduction to rotation
    L2 = 48.5 #distance from rotation to knee 
    L3 = 72.8 #elbow distance
    FOOT_RAD = 4.5
    
    def __init__(self, leg_ID, servo_elbow, servo_rotation, servo_abduction, x = 0, y = 0, z = 0):
        self.servo_elbow = servo_elbow
        self.servo_rotation = servo_rotation
        self.servo_abduction = servo_abduction
        self.leg_ID = leg_ID
        self.uart = servo_elbow.uart #Same uart per leg (for the three servos)
        self.rightLeg = True if self.leg_ID%2 == 0 else False # All right legs have even ID
        '''
        Position of the leg in the Cartesian plane to maintain a given position of the robot body
        '''
        self.x_pos = x
        self.y_pos = y
        self.z_pos = z
        
    @classmethod
    def fromServoID(cls, leg_ID, servo_ID_elbow, servo_ID_rotation, servo_ID_abduction, uart):
        return cls(leg_ID,Servo(servo_ID_elbow,uart),Servo(servo_ID_rotation,uart),Servo(servo_ID_abduction,uart))
    
   
    def getID(self): return self.leg_ID
    def getCommand(self,elbow_angle, rotation_angle, abductor_angle):
        return self.servo_elbow.getCommand(elbow_angle) + self.servo_rotation.getCommand(rotation_angle)+self.servo_abduction.getCommand(abductor_angle)
    def setPos(self,elbow_angle, rotation_angle, abductor_angle,time = 0):
        self.uart.write(self.servo_elbow.getCommand(elbow_angle) + self.servo_rotation.getCommand(rotation_angle)+self.servo_abduction.getCommand(abductor_angle)+"T"+ str(time)+"\r")
    def setPosIK(self,x,y,z,time = 0):
        angles = self.inversekinematic(x,y,z)
        self.setPos(angles[0], angles[1],angles[2],time)
    def getCommandIK(self,x,y,z):
        print("X:"+str(x)+"Y:"+str(y)+"Z:"+str(z))
        angles = self.inversekinematic(x,y,z)
        return self.getCommand(angles[0], angles[1],angles[2])
    
    
    def inversekinematic(self,x,y,z):
        
        if self.leg_ID == 1 or self.leg_ID == 3:
            zf = z - 10
        elif self.leg_ID == 2 or self.leg_ID == 4:
            zf = z + 10
        if self.leg_ID == 1 or self.leg_ID == 2:
            xf = x - 15
        elif self.leg_ID == 3 or self.leg_ID == 4:
            xf = x + 15
            
        zf = z
        xf = x
        abductor_angle = 0
        yf = y - Leg.FOOT_RAD
        #frontal displacement
        q2x = atan(xf/yf) 
        Yx = yf/cos(q2x)
        #lateral displacement
        Z = (zf+0.1) if abs(zf) == Leg.L1 else zf
        Z = Z if self.rightLeg else -Z
        a = atan((Leg.L1+Z)/yf)
        h = (Leg.L1+Z)/sin(a)
        b = Leg.L1/h
        abductor_angle = b-a
        Yz = h*cos(b) - yf
        Y = Yx + Yz
        #Height
        elbow_angle = acos(((Leg.L2**2)+(Leg.L3**2)-(Y**2))/(2*Leg.L3*Leg.L2)) 
        rotation_angle = acos(((Leg.L2**2)+(Y**2)-(Leg.L3**2))/(2*Y*Leg.L2)) + q2x
        print(str(degrees(elbow_angle))+" "+str(degrees(rotation_angle))+" "+str(degrees(abductor_angle)))
        return [degrees(elbow_angle),degrees(rotation_angle),degrees(abductor_angle)]
        
        
class Body:
    W = 51.5
    L = 89.8
    def __init__(self, legs, roll = 0, pitch = 0, yaw = 0, cgx = 0, cgy = 90, cgz = 0):
        self.roll = roll
        self.pitch = pitch
        self.yaw = yaw
        self.cgx = cgx
        self.cgy = cgy
        self.cgz = cgz
        self.uart = legs[0].uart #All the servos should be connected to the same UART
        self.legs = legs
        self.legs.sort(key=lambda x: x.leg_ID)
        self.cont = 0
        for leg in self.legs:
            leg.x_pos,leg.y_pos,leg.z_pos = self.calc_rpy(leg.leg_ID)
        
    def calc_rpy(self,leg_ID, mode = "independent"):
        #Convert degrees to radians
        roll_rads = radians(self.roll)
        pitch_rads = radians(self.pitch)
        yaw_rads = radians(self.yaw)
        
        #Distance of leg's system of coordinates to center of body
        w = Body.W/2
        l = Body.L/2
        
        #YAW
        
        #Added leg displacement and calculation of the actual distance from the center of the body
        Acl = atan(l/(w+Leg.L1))
        L = (w+Leg.L1)/cos(Acl)
        
        #Calculate the X and Z displacement and eliminate the leg offset.
        if leg_ID == 1:
            Zy = (-L*cos(Acl-yaw_rads)+w) + Leg.L1
            Xy = (-L*sin(Acl-yaw_rads)+l)
        elif leg_ID == 2:
            Zy = (L*cos(Acl+yaw_rads)-w) - Leg.L1
            Xy = (-L*sin(Acl+yaw_rads)+l)   
        elif leg_ID == 3:
            Zy = (-L*cos(Acl+yaw_rads)+w) + Leg.L1
            Xy = (L*sin(Acl+yaw_rads)-l) 
        elif leg_ID == 4:
            Zy = (L*cos(Acl-yaw_rads)-w) - Leg.L1
            Xy = (L*sin(Acl-yaw_rads)-l)
        else:
            print("error")
        
        if mode == "independent":
            cgxx = self.cgx*cos(yaw_rads)
            cgxz = self.cgx*sin(yaw_rads)
            cgzx = self.cgz*sin(yaw_rads)
            cgzz = self.cgz*cos(yaw_rads)
            Zy = Zy + cgxz + cgzz
            Xy = Xy + cgxx + cgzx

        
        ypdif = -l*sin(pitch_rads) if (leg_ID == 3 or leg_ID == 4) else l*sin(pitch_rads)
        yrdif = -w*sin(roll_rads) if (leg_ID == 2 or leg_ID == 4) else w*sin(roll_rads)
        
        #PITCH
        yb = self.cgy + ypdif + yrdif
        xb = (l-l*cos(pitch_rads)) if (leg_ID == 3 or leg_ID == 4) else (l*cos(pitch_rads)-l)
        xb = xb + Xy
        ax = atan(xb/yb)
        pitch_t = (pitch_rads + ax)
        hx = yb/cos(ax) 
        yb = hx*cos(pitch_t)
        X = hx*sin(pitch_t)

        #ROLL
        zb = (w-w*cos(roll_rads)) + Leg.L1 if (leg_ID == 2 or leg_ID == 4) else (w*cos(roll_rads)-w) - Leg.L1
        zb = zb + Zy
        az = atan((zb)/yb)
        yh = yb/cos(az)
        roll_t = (roll_rads + az)
        Y = yh*cos(roll_t)
        Z = yh*sin(roll_t) - Leg.L1  if (leg_ID == 2 or leg_ID == 4) else yh*sin(roll_t) + Leg.L1     
        
        if mode == "independent":
            Lz = Z
            Lx = X
        else:
            Lz = Z + self.cgz
            Lx = X + self.cgx
        Ly = Y 
        
        return Lx,Ly,Lz
        
    def updateBodyPos(self, x = 0, y = 90, z = 0,roll = 0, pitch = 0,  yaw = 0):
 
        self.roll = roll
        self.pitch = pitch
        self.yaw = yaw
        self.cgx = x
        self.cgy = y
        self.cgz = z
        '''
        for leg in self.legs:
            leg.x_pos = x
            leg.y_pos = y
            leg.z_pos = z 
        '''
        for leg in self.legs:
            leg.x_pos,leg.y_pos,leg.z_pos = self.calc_rpy(leg.leg_ID)
            
      
    def setBodyPos(self, time=2000):
        command = ""
        for leg in self.legs:
            command = command + leg.getCommandIK(leg.x_pos,leg.y_pos,leg.z_pos)
        self.uart.write(command+"T"+str(time)+"\r")
        
        
    @staticmethod
    def trajectory(i,beta):
        a = 20
        b = 20
        alpha = pi/2
        
        step = b/(beta*2) #beta: 3 stationary gait 1 dynamic gait
        
        if i < 4: # foot on the air
            y = -a*sin(i*pi/4)
            x = b*cos(i*pi/4)
            z = x*cos(alpha)
            x = x*sin(alpha)
        
        else:
            y = 0
            x = step*(i-4)-b
            z = x*cos(alpha)
            x = x*sin(alpha)
        
        return x,y,z
        
    def forward(self,time = 1000):
        beta = 3
        L = (1+beta)*4
        if self.cont >= L:
            self.cont = 0
            
        za = -20*cos(pi*self.cont/8)
        xa = 0#20*cos(pi*self.cont/4)   
        command = ""

        sec_order = 1
        i  = (self.cont+(sec_order-1)*4)%L
        print(i)
        x,y,z = self.trajectory(i,beta)
        command = command + self.legs[0].getCommandIK(self.legs[0].x_pos+x+xa,self.legs[0].y_pos+y,self.legs[0].z_pos+z+za)
        
        sec_order = 3
        i  = (self.cont+(sec_order-1)*4)%L
        print(i)
        x,y,z = self.trajectory(i,beta)
        command = command + self.legs[1].getCommandIK(self.legs[1].x_pos+x+xa,self.legs[1].y_pos+y,self.legs[1].z_pos+z+za)        
        
        sec_order = 2
        i  = (self.cont+(sec_order-1)*4)%L
        print(i)
        x,y,z = self.trajectory(i,beta)
        command = command + self.legs[2].getCommandIK(self.legs[2].x_pos+x+xa,self.legs[2].y_pos+y,self.legs[2].z_pos+z+za)
        
        sec_order = 4
        i  = (self.cont+(sec_order-1)*4)%L
        print(i)
        x,y,z = self.trajectory(i,beta)
        command = command + self.legs[3].getCommandIK(self.legs[3].x_pos+x+xa,self.legs[3].y_pos+y,self.legs[3].z_pos+z+za)
        self.cont = self.cont + 1
        
        print("COMANDO: "+command)
        self.uart.write(command+"T"+str(time)+"\r")
        
        






