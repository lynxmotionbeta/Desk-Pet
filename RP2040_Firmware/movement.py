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
        self.rot = -1 # -1: Counterclockwise 1: Clockwise
        self.beta = 3  # 1 for dynamic gait and 3 for static
        self.points = 4 #Simplified trajectory has 2 point in air
        self.steps = (1+self.beta)*self.points #Total of points for a period of the foot trajectory
        self.a = 20
        self.b = 10
        self.director_angle = pi/2 #forward
        self.rot_angle = radians(-10) 
        
    def calc_leg_pos(self,leg_ID, xf = 0, yf = 0, zf = 0, mode = 0):
        #Convert degrees to radians
        roll_rads = radians(self.roll)
        pitch_rads = radians(self.pitch)
        yaw_rads = radians(self.yaw)
        
        w = Body.w
        l = Body.l
        
        #YAW
        
        #Calculate the X and Z displacement and eliminate the leg offset.
        xft = xf + self.cgx
        zft = zf + self.cgz
        if leg_ID == 1:
            Acl = atan((l-xft)/(w+Leg.L1-zft))
            L = (w+Leg.L1-zft)/cos(Acl)
            Zy = (-L*cos(Acl-yaw_rads)+w) + Leg.L1
            Xy = (-L*sin(Acl-yaw_rads)+l) 
        elif leg_ID == 2:
            Acl = atan((l-xft)/(w+Leg.L1+zft))
            L = (w+Leg.L1+zft)/cos(Acl)
            Zy = (L*cos(Acl+yaw_rads)-w) - Leg.L1 
            Xy = (-L*sin(Acl+yaw_rads)+l)  
        elif leg_ID == 3:
            Acl = atan((l+xft)/(w+Leg.L1-zft))
            L = (w+Leg.L1-zft)/cos(Acl)
            Zy = (-L*cos(Acl+yaw_rads)+w) + Leg.L1 
            Xy = (L*sin(Acl+yaw_rads)-l)
        elif leg_ID == 4:
            Acl = atan((l+xft)/(w+Leg.L1+zft))
            L = (w+Leg.L1+zft)/cos(Acl)            
            Zy = (L*cos(Acl-yaw_rads)-w) - Leg.L1
            Xy = (L*sin(Acl-yaw_rads)-l) 
        else:
            print("error")
  
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
    def trajectory(self, leg_ID, xa = 0, za = 0, trajectory_type = "circular",):
        '''
        TYPE OF TRAJECTORIES:
        circular
        triangular
        square
        '''
        i = self.sequencer(leg_ID)
        a = self.a
        b = self.b
        z = b*cos(self.director_angle)
        x = b*sin(self.director_angle)
        xft = x + xa #+ self.cgx
        zft = z + za #+ self.cgz 
        
        w = Body.w
        l = Body.l
        # Rotational gait
        if leg_ID == 1:
            Acl = atan((l-xft)/(w+Leg.L1-zft))
            L = (w+Leg.L1-zft)/cos(Acl)
            Zy = (-L*cos(Acl-self.rot_angle)+w) + Leg.L1
            Xy = (-L*sin(Acl-self.rot_angle)+l) 
        elif leg_ID == 2:
            Acl = atan((l-xft)/(w+Leg.L1+zft))
            L = (w+Leg.L1+zft)/cos(Acl)
            Zy = (L*cos(Acl+self.rot_angle)-w) - Leg.L1 
            Xy = (-L*sin(Acl+self.rot_angle)+l)  
        elif leg_ID == 3:
            Acl = atan((l+xft)/(w+Leg.L1-zft))
            L = (w+Leg.L1-zft)/cos(Acl)
            Zy = (-L*cos(Acl+self.rot_angle)+w) + Leg.L1 
            Xy = (L*sin(Acl+self.rot_angle)-l)
        elif leg_ID == 4:
            Acl = atan((l+xft)/(w+Leg.L1+zft))
            L = (w+Leg.L1+zft)/cos(Acl)            
            Zy = (L*cos(Acl-self.rot_angle)-w) - Leg.L1
            Xy = (L*sin(Acl-self.rot_angle)-l)
            
        xft = x + Xy -xa
        zft = z + Zy -za
        #L = sqrt(x**2+z**2)
        print(xft)
        print(zft)
        beta = self.beta
        stepx = xft/(beta*2) #beta: 3 stationary gait 1 dynamic gait
        stepz = zft/(beta*2)
        
        const = pi/self.points
        if i < self.points: # foot on the air
            if trajectory_type == "circular":
                y = -a*sin(i*const)
                x = xft*cos(i*const)
                z = zft*cos(i*const)
            elif trajectory_type == "triangular":
                if i == 0:
                    y = 0
                    x = xft
                    z = zft
                elif i == 1:
                    y = a/2
                    x = xft/2
                    z = zft/2
                elif i == 2:
                    y = a
                    x = 0
                    z = 0
                elif i == 3:
                    y = a/2
                    x = -xft/2
                    z = -zft/2
            elif trajectory_type == "square":
                if i == 0:
                    y = 0
                    x = xft
                    z = zft
                elif i == 1:
                    y = a
                    x = xft/2
                    z = zft/2
                elif i == 2:
                    y = a
                    x = 0
                    z = 0
                elif i == 3:
                    y = a
                    x = -xft
                    z = -zft
        else:
            y = 0
            x = stepx*(i-self.points)-xft
            z = stepz*(i-self.points)-zft
        
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
        X = 20 
        Z = 10
        zd = 0
        if self.beta == 3:   
            zd = -25*cos(pi*self.cont/8) 
            #xa = 25*cos(pi*self.cont/8)*cos(self.director_angle)

                  
        self.cgx = 25
        self.cgz = zd
        self.cgy = 80
        self.pitch = 0
        self.roll = 0
        self.yaw = 0 #zroll
        
        if leg_ID == 1:
            xa += -X
            za += -Z
        elif leg_ID == 2:
            xa += -X
            za += Z
        elif leg_ID == 3:
            xa += X
            za += -Z
        elif leg_ID == 4:
            xa += X
            za += Z
        x,y,z = self.trajectory(leg_ID,xa,za, trajectory_type = "square")
        #x,y,z = 0,0,0

        x += xa
        z += za
        
        return x,y,z
    
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

        