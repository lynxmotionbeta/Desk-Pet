'''
 * Authors:    Eduardo Nunes
 * Version:    1.0
 * Licence:    LGPL-3.0 (GNU Lesser General Public License)
 *
 * Description: A library that performs inverse kinematics for a quadruped
 *              robot.
'''

from math import cos,sin,atan,acos,degrees,radians,pi,sqrt
from lss import LSS
import config as cfg

# "Constants"
# Dynamic, Static = range(2)

# a,\
# b,\
# c,\
# d = range(4)

##### UTILS
def multMV(matrix, vec):  # multiply a 3*3 rotation matrix by a vector
    return [sum(a*b for a,b in zip(row,vec)) for row in matrix]

def sumVV(vec1, vec2): 
    return [a + b for a,b in zip(vec1,vec2)]

def subsVV(vec1, vec2): 
    return [a - b for a,b in zip(vec1,vec2)]

def distVV(vec1,vec2):
    dif = subsVV(vec1,vec2)
    return sqrt(dif[0]**2+dif[1]**2+dif[2]**2)

def calcRotMatrix(angle):
        a = 0
        b = 0
        g = radians(angle)
        matrix = [[0,0,0],[0,0,0],[0,0,0]]
        matrix[0][0] = cos(b)*cos(g)
        matrix[0][1] = sin(a)*sin(b)*cos(b)-cos(a)*sin(g)
        matrix[0][2] = cos(a)*sin(b)*cos(g)+sin(a)*sin(g)

        matrix[1][0] = cos(b)*sin(g)
        matrix[1][1] = sin(a)*sin(b)*sin(g)+cos(a)*cos(g)
        matrix[1][2] = cos(a)*sin(b)*sin(g)-sin(a)*cos(g)

        matrix[2][0] = -sin(b)
        matrix[2][1] = sin(a)*cos(b)
        matrix[2][2] = cos(a)*cos(b)
        return matrix

##### JOINT CLASS 
'''
The Joints class serves as a bridge for controlling servo motors, utilizing the angle calculated by an algorithm. 
To execute this properly, servo calibration and offset adjustments may be necessary. 
The Joints class handles these transformations to calculate the actual servo angle needed and sends it through the LSS servo library.
'''
class Joints():
    RANGE_DEGREES = cfg.OPERATION_RANGE_DEGREES
    RANGE_PULSES = cfg.OPERATION_RANGE_PULSES

    DEG_PULSE_RATE = abs(RANGE_PULSES[1]-RANGE_PULSES[0])/RANGE_DEGREES
    
    # Config angles
    joint_calibration_offset = [[0,0,0],   # Leg 1
                                [0,0,0],   # Leg 2
                                [0,0,0],   # Leg 3
                                [0,0,0]]   # Leg 4          # Angle for calibration
    
    position_feedback_offset = [[0,0,0],   # Leg 1
                                [0,0,0],   # Leg 2
                                [0,0,0],   # Leg 3
                                [0,0,0]]   # Leg 4          # Angle for calibration
    #Joints constants
    # JOINT_ORIENTATION_MAP = ((0,1,0),   # Leg 1
    #                         (1,1,0),   # Leg 2
    #                         (1,0,1),   # Leg 3
    #                         (0,0,1))   # Leg 4

    JOINT_ORIENTATION_MAP = ((0,1,1),   # Leg 1
                            (1,1,1),   # Leg 2
                            (1,0,0),   # Leg 3
                            (0,0,0))   # Leg 4
    
    DESKPET_JOINT_OFFSET = (90,60,0)        # Abductor, Rotation, Knee angles in degrees to set the new origin angle
    DESKPET_JOINT_MINMAX = ((-50,-50,30),  #min / Regarding the new origin angle
                           (50,110,160)) #max
    
    # DESKPET_JOINT_MINMAX = ((0,0,0),  #min / Regarding the new origin angle
    #                        (360,360,360)) #max

    def __init__(self, leg_id=None, joint_id=None):
        if leg_id is None and joint_id is None:
            raise ValueError("leg_id and joint_id must not be None")
        if not 1 <= leg_id <= 4:
            raise ValueError("leg_id must be greater than 1 and less than 4")
        if not 1 <= joint_id <= 3:
            raise ValueError("joint_id must be greater than 1 and less than 3")
        self.leg_id = leg_id
        self.joint_id = joint_id
        self.lss = LSS(cfg.SERVO_ID_MAPPING[leg_id - 1][joint_id - 1])

    # In group motion methods
    @classmethod
    def updatePos(cls, time = None, speed = None):
        return LSS.updateGroup(time,speed)

    def setPos(self, angle = None):
        return self.lss.setPos(self.a2p(angle))

    # Calibration function
    @classmethod
    def resetCalibration(cls): # A LSS cmd need to be added in order to receive the calibration matrix from the user interafce (ESP)
        cls.joint_calibration_offset = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]]

    def calibrateJoint(self,angle): # A LSS cmd need to be added in order to receive the calibration matrix from the user interafce (ESP)
        Joints.joint_calibration_offset[self.leg_id-1][self.joint_id-1] = angle

    # Joint motion methods
    def move(self, angle = None, time = None):
        pulses = self.a2p(angle)
        # Send cmd to servo using lss library
        if time is None:
            self.lss.moveP(pulses)
        else:
            self.lss.movePT(pulses, time)
        return True

    def hold(self, leg = None, joint = None, angles = None):
        self.lss.hold()

    def limp(self):
        self.lss.limp()

    def getPosFeedback(self, leg = None, joint = None): # return the positon feedback into a matrix or list in increasing order joint or in the requested order
        pass

    def calibrate(self, angle):
        Joints.joint_calibration_offset[self.leg_id][self.joint_id] = angle 
        self.updatePos()      

    ## Utils methods
    def a2p(self, angle):
        # Verify move limits
        angle_r = Joints.DESKPET_JOINT_MINMAX[0][self.joint_id - 1] if angle < Joints.DESKPET_JOINT_MINMAX[0][self.joint_id - 1] else angle
        angle_r = Joints.DESKPET_JOINT_MINMAX[1][self.joint_id - 1] if angle > Joints.DESKPET_JOINT_MINMAX[1][self.joint_id - 1] else angle_r

        # Convert the angle
        #Add origin and calibration offsets
        angle_o = angle_r + Joints.DESKPET_JOINT_OFFSET[self.joint_id-1] + Joints.joint_calibration_offset[self.leg_id-1][self.joint_id-1]
        #Convert the angle
        pulse = Joints.DEG_PULSE_RATE*(Joints.RANGE_DEGREES-angle_o)+Joints.RANGE_PULSES[0] if Joints.JOINT_ORIENTATION_MAP[self.leg_id-1][self.joint_id-1] else Joints.DEG_PULSE_RATE*(angle_o)+Joints.RANGE_PULSES[0]
        return round(pulse)

class Leg:
    L1 = 50
    L2 = 49
    L3 = 68.6
    foot_rad = 7
    DESKPET_LEG_MODEL = [0,0,-18.7] #joint adjustment in Deg for the leg kinematics model

    def __init__(self, leg_id=1, offset_x=0, offset_y=0):

        if not 1 <= leg_id <= 4:
            raise("Invalid leg ID")
        self.leg_ID = leg_id
        # Right legs have an even ID
        if self.leg_ID <= 2:
            self.rightLeg = True
        else:
            self.rightLeg = False

        # Create the 3 joints
        self.joint = [Joints(leg_id,j) for j in range(1,4)]

        # Angular positions
        self.prev_pos = [0,0,0]
        self.next_pos = [0,0,0]

        # Distance from the leg to the body rotation point
        self.body_rot_distance = [0,0,0] 

        # Foot position offset respect the body center coordinate system
        self.foot_offset = [(offset_x if leg_id%2 == 0 else -offset_x),(-offset_y if self.rightLeg else offset_y),0]

        # Resting offsets
        self.rest_pos = [0,0,0]

        ## Gait class
        self.walk = Walking(self.leg_ID)

    def inverseKinematics(self,x,y,z):
        yf = y - Leg.foot_rad
        try:
            # Lateral displacement
            dz = z-Leg.L1 if self.rightLeg else -z-Leg.L1
            beta = atan((Leg.L1+dz)/yf)
            h = yf/cos(beta)
            gamma = acos(Leg.L1/h)
            abduction_angle = beta+gamma-pi/2.0
            Yz = h*sin(gamma)

            #Frontal displacement
            theta = atan(x/Yz)
            Y = Yz/cos(theta)

            #Height
            knee_angle = acos((pow(Leg.L2,2)+pow(Leg.L3,2)-pow(Y,2))/(2.0*Leg.L3*Leg.L2))
            rotation_angle = acos((pow(Leg.L2,2)+pow(Y,2)-pow(Leg.L3,2))/(2.0*Y*Leg.L2)) + theta

            return (degrees(abduction_angle),degrees(rotation_angle),degrees(knee_angle) + Leg.DESKPET_LEG_MODEL[2])
        except:
            print("Domain error calculating the inverse kinematics: LEG {}".format(self.leg_ID))
            return None

    def setPosIK(self,leg_coordinates):
        angles = self.inverseKinematics(*leg_coordinates) 
        #print(f"leg: {self.leg_ID} : angles: {angles}")
        if angles is not None:
            self.prev_pos = self.next_pos
            self.next_pos = angles    
            self.joint[0].setPos(self.next_pos[0])
            self.joint[1].setPos(self.next_pos[1])
            self.joint[2].setPos(self.next_pos[2])

    def setPosDK(self,joint_angles):
        self.prev_pos = self.next_pos
        self.next_pos = joint_angles
        self.joint[0].setPos(self.next_pos[0])
        self.joint[1].setPos(self.next_pos[1])
        self.joint[2].setPos(self.next_pos[2] + Leg.DESKPET_LEG_MODEL[2])

    def assembly(self): # Set the servo positions for assembly
        self.joint[0].setPos(0)
        self.joint[1].setPos(0)
        self.joint[2].setPos(90)
    
    def calibration(self,leg_coordinates): # Add feedback calibration
        angles = self.inverseKinematics(*leg_coordinates) 
        for i in range(3):
            self.joint[i].calibrate(angles[i])

class Body:
    # Body dimensions in millimeters
    W = 50
    L = 106

    w = W/2
    l = L/2

    # Default body rotation point coordinates
    wr = -w
    wl = w
    lf = l
    lr = -l

    def __init__(self,height = 80, rot_point_x = 0, rot_point_y = 0):

        # Set the body's rotation point coordinates from the body center
        Body.wr = -rot_point_y - Body.w
        Body.wl = -rot_point_y + Body.w
        Body.lf = -rot_point_x + Body.l
        Body.lr = -rot_point_x - Body.l

        # Crate and config the legs parameters for Deskpet
        self.legs = [Leg(leg_id=i,offset_x = 10,offset_y=Leg.L1-10) for i in range(1,5)]
        self.updateConfig()# Optimize it

        # Used to control the x, y and z displacement (height) with respect to the body orientation
        self.body_offsetB = [0,0,0]
        self.translation = [0,0,height]

        ## Used to balance the robot with respect to the body's point of rotation.
        self.balance_angles = [0,0,0]
        self.cog = [0,0,0]
        self.balance_matrix = [[0,0,0],[0,0,0],[0,0,0]]
        self.calcBalanceMatrix()
        # Activate balance function
        self.balance_function = True

        # Roll Pitch and yaw control variables
        self.rpy_angles = [0,0,0]
        self.rpy_matrix =  [[0,0,0],[0,0,0],[0,0,0]]  
        self.calcRPYMatrix()     

        self.assembly_mode = False

    def updatePos(self,time):
        if self.assembly_mode:
            return

        #self.calcBalanceMatrix()

        # for leg in self.legs:
        #     if self.balance_function:
        #         #balance_system = self.rotate(*self.balance_angles)*(leg.rest_pos-self.cog) - self.translation
        #         foot_pos = subsVV(leg.rest_pos,self.cog)
        #         balance_system = subsVV(multMV(self.balance_matrix,sumVV(foot_pos,leg.walk.getNextWalkStep())), subsVV(self.translation,leg.walk.getNextRotStep(foot_pos)))
        #         #balance_system = subsVV(multMV(self.balance_matrix,sumVV(subsVV(leg.rest_pos,self.cog),(0,0,0))), self.translation)
        #         rot_point = subsVV(multMV(self.rpy_matrix,balance_system), self.body_offsetB) # RPY IMU entry data for balance / the point use the constant leg rest positionsince it is only for balance.

        #     leg.next_pos = (-rot_point[0]+leg.body_rot_distance[0],-rot_point[2]+leg.body_rot_distance[1],-rot_point[1]+leg.body_rot_distance[2])
        
        for leg in self.legs:
            foot_pos = subsVV(leg.rest_pos,self.cog)
            if self.balance_function:                
                balance_system = subsVV(multMV(self.balance_matrix,leg.walk.getNextWalkStep(foot_pos)), self.translation)
                rot_point = subsVV(multMV(self.rpy_matrix,balance_system), self.body_offsetB )# RPY IMU entry data for balance / the point use the constant leg rest positionsince it is only for balance.

            leg.next_pos = (-rot_point[0]+leg.body_rot_distance[0],-rot_point[2]+leg.body_rot_distance[1],-rot_point[1]+leg.body_rot_distance[2])
                
            leg.setPosIK(leg.next_pos)
        
        #self.legs[0].setPosIK(self.legs[0].next_pos)   

        Joints.updatePos(time)
        # Update the walking sequence index
        Walking.updateSequence()  

    #######
    def setRPYAngles(self,r = 0,p = 0, y = 0):
        self.rpy_angles[0] = r 
        self.rpy_angles[1] = p
        self.rpy_angles[2] = y
        self.calcRPYMatrix()

    def setXYZDisp(self,x = 0, y = 0, height = 80):
        self.translation[0] = x
        self.translation[1] = y
        self.translation[2] = height

    def setXYbodyDisp(self,xb = 0, yb = 0):
        self.body_offsetB[0] = xb
        self.body_offsetB[1] = yb
    #####
    def updateConfig(self):
        for leg in self.legs:
            if (leg.leg_ID == 1):
                leg.body_rot_distance = [Body.lr,0,Body.wr]
                leg.rest_pos = [Body.lr,Body.wr,0]
            elif(leg.leg_ID == 2):
                leg.body_rot_distance = [Body.lf,0,Body.wr]
                leg.rest_pos = [Body.lf,Body.wr,0]
            elif(leg.leg_ID == 3):
                leg.body_rot_distance =  [Body.lr,0,Body.wl]
                leg.rest_pos = [Body.lr,Body.wl,0]
            elif(leg.leg_ID == 4):
                leg.body_rot_distance = [Body.lf,0,Body.wl]
                leg.rest_pos = [Body.lf,Body.wl,0]
            else:
                raise("Wrong Leg ID")
            leg.rest_pos = sumVV(leg.rest_pos,leg.foot_offset)

    def changeFO(self,offset_x = 0,offset_y = 0): # Update foot offset
        for leg in self.legs:
            leg.foot_offset = [(offset_x if leg.leg_ID%2 == 0 else -offset_x),(-offset_y if leg.rightLeg else offset_y),0]
        self.updateConfig(leg)

    def changeRP(self,rot_point_x = 0,rot_point_y = 0): # Update rotation point
        Body.wr = -rot_point_y - Body.w
        Body.wl = -rot_point_y + Body.w
        Body.lf = -rot_point_x + Body.l
        Body.lr = -rot_point_x - Body.l
        self.updateConfig()

    def calcBalanceMatrix(self):
        a = radians(self.balance_angles[0])
        b = radians(self.balance_angles[1])
        g = radians(self.balance_angles[2])

        self.balance_matrix[0][0] = cos(b)*cos(g)
        self.balance_matrix[0][1] = sin(a)*sin(b)*cos(b)-cos(a)*sin(g)
        self.balance_matrix[0][2] = cos(a)*sin(b)*cos(g)+sin(a)*sin(g)

        self.balance_matrix[1][0] = cos(b)*sin(g)
        self.balance_matrix[1][1] = sin(a)*sin(b)*sin(g)+cos(a)*cos(g)
        self.balance_matrix[1][2] = cos(a)*sin(b)*sin(g)-sin(a)*cos(g)

        self.balance_matrix[2][0] = -sin(b)
        self.balance_matrix[2][1] = sin(a)*cos(b)
        self.balance_matrix[2][2] = cos(a)*cos(b)

    def calcRPYMatrix(self):
        a = radians(self.rpy_angles[0])
        b = radians(self.rpy_angles[1])
        g = radians(self.rpy_angles[2])

        self.rpy_matrix[0][0] = cos(b)*cos(g)
        self.rpy_matrix[0][1] = sin(a)*sin(b)*cos(b)-cos(a)*sin(g)
        self.rpy_matrix[0][2] = cos(a)*sin(b)*cos(g)+sin(a)*sin(g)

        self.rpy_matrix[1][0] = cos(b)*sin(g)
        self.rpy_matrix[1][1] = sin(a)*sin(b)*sin(g)+cos(a)*cos(g)
        self.rpy_matrix[1][2] = cos(a)*sin(b)*sin(g)-sin(a)*cos(g)

        self.rpy_matrix[2][0] = -sin(b)
        self.rpy_matrix[2][1] = sin(a)*cos(b)
        self.rpy_matrix[2][2] = cos(a)*cos(b)

    def assembly(self):
        self.assembly_mode = True
        for leg in self.legs:
            leg.assembly()
        Joints.updatePos(100)     

    @staticmethod
    def walkingDirection(angle):
        Walking.changeAngle(angle)

    # def rotateCCW(self):
    #     pass

    # def rotateCW(self):
    #     pass

Dynamic, Static = range(2)
class Walking:

    # Step size variables
    bh = 5
    sh = 25+bh
    sl = 40

    # Gait variables
    swing_traj_points = 4 # 4 is the minimun point to describe the swing trajectory
    beta = 1 # 1 for dynamic and 3 for static gait
    trajectory_points = (1+beta)*swing_traj_points # Number of points for a complete trajectory cycle
    gait_phase = trajectory_points/(beta+1)
    dstep = sl/(swing_traj_points*beta) # Distance to be moved between points of the stance stage

    dynamic_leg_sequence = [2,1,3,0] # Position of the list is the leg ID and the content is the order to move
    static_leg_sequence = [3,0,1,2]
    leg_sequence = dynamic_leg_sequence if beta == 1 else static_leg_sequence

    counter = 0 # Next trajectory sample point

    directing_angle = 0 # radians(90) ## 90 deg is default forward direction - 0: STOP
    new_directing_angle = radians(90)

    swing_dist_z = [0.8,1,0.5,0]
    swing_dist_xy = [0.8,0,0.7,1]
    stance_dist_z = [0.5,1,0.5,0]   

    rot_direction = 1  # 0: STOP, 1:CW, -1:CCW
    new_rot_direction = 0

    update_flag = False

    angle_field = 30

    ## 10 DEG ROTATION MATRIX
    CW_ROTATION_MATRIX = [[0.9396926, 0.3420201, 0.0], [-0.3420201, 0.9396926, -0.0], [-0.0, 0.0, 1.0]]
    CCW_ROTATION_MATRIX = [[0.9396926, -0.3420201, 0.0], [0.3420201, 0.9396926, 0.0], [-0.0, 0.0, 1.0]]

    def __init__(self, leg_id):

        self.leg_ID = leg_id

        #self.current_point = [0,0,0] #from feedback position
        self.next_point = [0,0,0]

        self.dp = [0,0,0] # Desired point
        self.cp = [0,0,0] # Contact point
        self.tp = [0,0,0] # Transition point from stance to swing stage
        self.rot_distance = [0,0,0] # Foot travel distance required for the robot to rotate

    # def swingStage(self,counter): # Air
    #     half_sl = Walking.sl/2
    #     self.dp = [half_sl*sin(Walking.directing_angle),-1*half_sl*cos(Walking.directing_angle),0]
    #     self.next_point[2] = Walking.swing_dist_z[counter]*Walking.sh         # Z or height of the desired step
    #     self.next_point[1] = Walking.swing_dist_xy[counter]*(self.tp[1]) if counter < 2 else Walking.swing_dist_xy[counter]*(self.dp[1])
    #     self.next_point[0] = Walking.swing_dist_xy[counter]*(self.tp[0]) if counter < 2 else Walking.swing_dist_xy[counter]*(self.dp[0])

    # def stanceStage(self,counter): # Floor
    #     const_phase = pi/(4*Walking.beta)
    #     self.dp = [Walking.dstep*sin(Walking.directing_angle),-1*Walking.dstep*cos(Walking.directing_angle),Walking.bh*sin((counter-3)*const_phase)]
    #     self.next_point[0] -= self.dp[0]
    #     self.next_point[1] -= self.dp[1]
    #     self.next_point[2] = self.dp[2]
    #     self.tp = self.next_point

    ##############

    def swingStage(self,counter,foot_pos): # Air
        self.dp = [0,0,0]
        if(Walking.rot_direction == -1):
            self.dp = multMV(Walking.CCW_ROTATION_MATRIX,foot_pos)
            self.rot_distance = subsVV(self.dp,foot_pos)
            self.dp = list(map(lambda x: x / 2, self.rot_distance)) 
        elif(Walking.rot_direction == 1):
            self.dp = multMV(Walking.CW_ROTATION_MATRIX,foot_pos)
            self.rot_distance = subsVV(self.dp,foot_pos)
            self.dp = list(map(lambda x: x / 2, self.rot_distance)) 

        if(Walking.directing_angle!=0):
            half_sl = Walking.sl/2
            self.dp[0] += half_sl*sin(Walking.directing_angle)
            self.dp[1] += -1*half_sl*cos(Walking.directing_angle) 
        
        if(Walking.directing_angle!=0 or Walking.rot_direction != 0):
            self.next_point[2] = Walking.swing_dist_z[counter]*Walking.sh
            self.next_point[1] = Walking.swing_dist_xy[counter]*(self.tp[1]) if counter < 2 else Walking.swing_dist_xy[counter]*(self.dp[1])
            self.next_point[0] = Walking.swing_dist_xy[counter]*(self.tp[0]) if counter < 2 else Walking.swing_dist_xy[counter]*(self.dp[0])
        else:
            self.next_point[2] = 0

    def stanceStage(self,counter,foot_pos): # Floor
        self.dp = [0,0,0]
        const_phase = pi/(4*Walking.beta)
        if(Walking.directing_angle!=0):
            self.dp = [Walking.dstep*sin(Walking.directing_angle),-1*Walking.dstep*cos(Walking.directing_angle),0]
        
        if(Walking.rot_direction!=0):
            self.dp[0] += self.rot_distance[0]/4
            self.dp[1] += self.rot_distance[1]/4
        
        self.next_point[0] -= self.dp[0]
        self.next_point[1] -= self.dp[1]

        if(Walking.directing_angle!=0 or Walking.rot_direction != 0):
            self.next_point[2] = Walking.bh*sin((counter-3)*const_phase)
        else:
            self.next_point[2] = 0
        self.tp = self.next_point

    def getLegCounter(self):
        return (int(Walking.counter+(Walking.gait_phase*Walking.leg_sequence[self.leg_ID-1]))%Walking.trajectory_points)

    def getNextWalkStep(self,foot_pos):
        counter = self.getLegCounter()

        if(Walking.update_flag):
            if(self.isLegSide() and counter == (1)):
                Walking.updateParams()
            
        if counter < 3:
            self.swingStage(counter,foot_pos)
        elif counter == 3:
            # At this point the foot should have been reach the desired point
            self.swingStage(counter,foot_pos) 
            self.cp = self.next_point
        else: # stance stage
            self.stanceStage(counter,foot_pos)

        #print(f"next_point for leg: {self.leg_ID} // and counter: {counter} //",self.next_point)
        # Update height

        new_position = sumVV(self.next_point,foot_pos)
        return new_position

    def isLegSide(self):
        if (self.leg_ID == 1):
            if((270 - Walking.angle_field <= degrees(Walking.new_directing_angle) <= 360) or (1 <= degrees(Walking.new_directing_angle) <= Walking.angle_field)):
                return True
        elif (self.leg_ID == 2):
            if((1 <= degrees(Walking.new_directing_angle) <= 90 + Walking.angle_field) or (360 - Walking.angle_field <= degrees(Walking.new_directing_angle) <= 360)):
                return True
        elif (self.leg_ID == 3):
            if(180 - Walking.angle_field <= degrees(Walking.new_directing_angle) <= 270 + Walking.angle_field):
                return True
        elif (self.leg_ID == 4):
            if(90 - Walking.angle_field <= degrees(Walking.new_directing_angle) <= 180 + Walking.angle_field):
                return True

    @classmethod
    def updateSequence(cls):
        if cls.counter >= cls.trajectory_points:
            cls.counter = 0
        cls.counter +=1

    @classmethod
    def changeStepSize(cls,step_height = None, step_length = None):
        if step_height is not None:
            cls.sh = step_height
        if step_length is not None:
            cls.sl = step_length      
    
    @classmethod
    def changeGait(cls, type = Dynamic):
        #change phase an in order to doo that increase the number point of the trajectory also need to change
        if type == Dynamic:
            cls.beta = 1
            cls.leg_sequence = cls.dynamic_leg_sequence 
        elif type == Static:
            cls.beta = 3
            cls.leg_sequence = cls.static_leg_sequence

        cls.trajectory_points = (1+cls.beta)*cls.swing_traj_points # Number of points for a complete trajectory cycle
        cls.gait_phase = cls.trajectory_points/(cls.beta+1)
        cls.dstep = cls.sl/(cls.swing_traj_points*cls.beta) # Distance to be moved between points of the stance stage

    @classmethod
    def changeAngle(cls,new_angle):
        cls.update_flag = True
        cls.new_directing_angle = radians(new_angle)

    @classmethod
    def updateParams(cls):
        cls.update_flag = False
        cls.directing_angle = cls.new_directing_angle


    




