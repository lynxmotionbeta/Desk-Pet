from math import cos,tan,sin,asin,atan,acos, sqrt, degrees,radians,pi

class Servo:
    def __init__(self,ID, uart, offset = 0, invert = False, servo_range = 170):
        self.offset = offset
        self.ID = ID
        self.pulse_header = "#"+str(ID)+"P"
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
        command = self.pulse_header+str(self.angleToPulse(angle))+"T"+ str(time)+"\r"       
        self.uart.write(command)
    def getCommand(self,angle):
        return(self.pulse_header+str(self.angleToPulse(angle)))
    def getConfig(self):
        return "offset:" + str(self.offset) +",ID:"+self.ID_STR+",invert:"+str(self.invert)+",servo_range:"+str(self.servo_range)+",uart:"+str(self.uart)
    def getID(self): return self.ID
    
class Leg: #quadruped
    
    L1 = 24.4 #distance from abduction to rotation
    L2 = 48.5 #distance from rotation to knee 
    L3 = 72.8 #elbow distance
    FOOT_RAD = 4.5
    
    def __init__(self, leg_ID, servo_elbow, servo_rotation, servo_abduction, x = 0, y = 90, z = 0):
        self.servo_elbow = servo_elbow
        self.servo_rotation = servo_rotation
        self.servo_abduction = servo_abduction
        self.leg_ID = leg_ID
        self.uart = servo_elbow.uart #Same uart per leg (for the three servos)
        self.rightLeg = True if self.leg_ID%2 == 0 else False # All right legs have even ID
        '''
        Current leg position
        '''
        self.x_pos = x
        self.y_pos = y
        self.z_pos = z
        angles = self.inversekinematic(x,y,z)
        self.a1 = angles[0]
        self.a2 = angles[1]
        self.a3 = angles[2]
        
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
        self.a1 = angles[0]
        self.a2 = angles[1]
        self.a3 = angles[2]
        self.setPos(angles[0], angles[1],angles[2],time)
    def getCommandIK(self,x,y,z):
        angles = self.inversekinematic(x,y,z)
        self.a1 = angles[0]
        self.a2 = angles[1]
        self.a3 = angles[2]
        return self.getCommand(angles[0], angles[1],angles[2])
    
    
    def inversekinematic(self,x,y,z):
            
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
        #print(str(degrees(elbow_angle))+" "+str(degrees(rotation_angle))+" "+str(degrees(abductor_angle)))
        return [degrees(elbow_angle),degrees(rotation_angle),degrees(abductor_angle)]
        
        
class Body:
    W = 51.5
    L = 89.8
    #Distance of leg's system of coordinates to center of body
    w = W/2
    l = L/2
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
            leg.x_pos,leg.y_pos,leg.z_pos = self.calc_leg_pos(leg.leg_ID)
            
        # Gait variables
        self.lineal_speed = 0
        self.rot_speed = 0
        self.rot = 1 # -1: Counterclockwise 1: Clockwise
        self.beta = 3  # 1 for dynamic gait and 3 for static
        self.points = 4 #Simplified trajectory has 2 point in air
        self.steps = (1+self.beta)*self.points #Total of points for a period of the foot trajectory
        self.a = 20
        self.b = 10
        self.director_angle = pi/2 #forward
        
    def calc_leg_pos(self,leg_ID, xf = 0, yf = 0, zf = 0, mode = 0):
        #Convert degrees to radians
        roll_rads = radians(self.roll)
        pitch_rads = radians(self.pitch)
        yaw_rads = radians(self.yaw)
        
        w = Body.w
        l = Body.l
        
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
            
        '''
            If the mode is "0" the robot body center will Surge, Sway and Heave
            with respect to the original coordinate system with roll, pitch and Yaw equal to 0.
        '''
        if mode == 0:
            cgxx = self.cgx*cos(yaw_rads)
            cgxz = self.cgx*sin(yaw_rads)
            cgzx = self.cgz*sin(yaw_rads)
            cgzz = self.cgz*cos(yaw_rads)
            Zy = Zy + cgxz + cgzz
            Xy = Xy + cgxx + cgzx
        
        # The displacements of the foot in x and y due to walking are added.
        Zy = Zy + zf
        Xy = Xy + xf
        
        ypdif = -l*sin(pitch_rads) if (leg_ID == 3 or leg_ID == 4) else l*sin(pitch_rads)
        yrdif = -w*sin(roll_rads) if (leg_ID == 2 or leg_ID == 4) else w*sin(roll_rads)
        
        #PITCH
        yb = self.cgy + ypdif + yrdif - yf
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
        
        if mode == 0:
            Lz = Z
            Lx = X
        else:
            Lz = Z + self.cgz
            Lx = X + self.cgx
        Ly = Y 
        
        return Lx,Ly,Lz
        
    def setBodyPos(self, cgx = 0, cgy = 90, cgz = 0, roll = 0, pitch = 0,  yaw = 0):
        self.roll = roll
        self.pitch = pitch
        self.yaw = yaw
        self.cgx = cgx
        self.cgy = cgy
        self.cgz = cgz
                    
    def updateBodyPos(self, time=2000):
        command = ""
        for leg in self.legs:
            command = command + leg.getCommandIK(leg.x_pos,leg.y_pos,leg.z_pos)
        self.uart.write(command+"T"+str(time)+"\r")
    
    
    # Gait methods   
    def trajectory(self, i, trajectory_type = "circular", angle = pi/2):
        '''
        TYPE OF TRAJECTORIES:
        circular
        triangular
        square
        '''
        a = self.a
        b = self.b
        beta = self.beta
        step = b/(beta*2) #beta: 3 stationary gait 1 dynamic gait
        if i < self.points: # foot on the air
            if trajectory_type == "circular":
                y = -a*sin(i*pi/self.points)
                x = b*cos(i*pi/self.points)

            elif trajectory_type == "triangular":
                if i == 0:
                    y = 0
                    x = b
                elif i == 1:
                    y = a/2
                    x = b/2
                elif i == 2:
                    y = a
                    x = 0
                elif i == 3:
                    y = a/2
                    x = -b/2
            elif trajectory_type == "square":
                if i == 0:
                    y = 0
                    x = b
                elif i == 1:
                    y = a
                    x = b/2
                elif i == 2:
                    y = a
                    x = 0
                elif i == 3:
                    y = a
                    x = -b
                
            z = x*cos(angle)
            x = x*sin(angle)
        else:
            y = 0
            x = step*(i-self.points)-b
            z = x*cos(angle)
            x = x*sin(angle)
        
        return x,y,z
    
    def sequencer(self,leg_ID):
        '''Receives the id of the leg and returns the corresponding point on the trajectory'''
        if self.beta == 1:
            sec_order = [0,1,1,0] # Order of the legs for movement
        else:
            sec_order = [0,2,1,3] # Order of the legs for movement

        if self.cont >= self.steps:
            self.cont = 0
        i  = (self.cont+(sec_order[leg_ID-1])*self.points)%self.steps
        return i
        
    def stabilizer(self,leg_ID):
        xa = 0
        za = 0
        X = 0
        Z = 0
        if self.beta == 3:   
            za = -20*cos(pi*self.cont/8)
            #xa = 25*cos(pi*self.cont/8)*cos(self.director_angle)
            #X = 20
            #Z = 10
        self.cgx = 20
        self.cgy = 80
        self.pitch = 0
        self.roll = 0
        self.yaw = 0
        
        xr,yr,zr = self.trajectory(self.sequencer(leg_ID), trajectory_type = "square", angle = pi/4)
        
        if leg_ID == 1:
            xa += -X
            za += -Z
            xr = -xr
        elif leg_ID == 2:
            xa += -X
            za += Z
        elif leg_ID == 3:
            xa += X
            za += -Z
            zr = -zr
        elif leg_ID == 4:
            xa += X
            za += Z
            zr = -zr
            
        xr = xr*self.rot
        zr = zr*self.rot

        
        
        #x,y,z = self.trajectory(self.sequencer(leg_ID), trajectory_type = "square", angle = self.director_angle)
        #x += xa
        #z += za
        xr += xa
        zr += za
        return xr,yr,zr
    
    def move(self):

        x,y,z = self.stabilizer(self.legs[0].leg_ID)
        self.legs[0].x_pos,self.legs[0].y_pos,self.legs[0].z_pos = self.calc_leg_pos(self.legs[0].leg_ID,x,y,z)
        
        x,y,z = self.stabilizer(self.legs[1].leg_ID)
        self.legs[1].x_pos,self.legs[1].y_pos,self.legs[1].z_pos = self.calc_leg_pos(self.legs[1].leg_ID,x,y,z)
        
        x,y,z = self.stabilizer(self.legs[2].leg_ID)
        self.legs[2].x_pos,self.legs[2].y_pos,self.legs[2].z_pos = self.calc_leg_pos(self.legs[2].leg_ID,x,y,z)

        x,y,z = self.stabilizer(self.legs[3].leg_ID)
        self.legs[3].x_pos,self.legs[3].y_pos,self.legs[3].z_pos = self.calc_leg_pos(self.legs[3].leg_ID,x,y,z)
      
        self.cont = self.cont + 1

        
        
     
    






