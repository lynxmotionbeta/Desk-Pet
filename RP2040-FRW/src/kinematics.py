'''
 * Authors:    Eduardo Nunes
 * Version:    1.0
 * Licence:    LGPL-3.0 (GNU Lesser General Public License)
 *
 * Description: A library that performs inverse kinematics and motion for Lynxmotion's DeskPet robot.
'''

from math import cos,sin,atan,acos,degrees,radians,pi,sqrt
from lib.lss import LSS
import config as cfg
from src.utils import SmoothMotionController,DTime
from src.constants import Rotation, Gait


######################################## UTILS FUNCTIONS 

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

######################################## JOINT CODE
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
    JOINT_ORIENTATION_MAP = ((0,1,1),   # Leg 1
                            (1,1,1),   # Leg 2
                            (1,0,0),   # Leg 3
                            (0,0,0))   # Leg 4
    
    DESKPET_JOINT_OFFSET = (90,60,0)        # Abductor, Rotation, Knee angles in degrees to set the new origin angle
    DESKPET_JOINT_MINMAX = ((-100,-100,-100),  #min / Regarding the new origin angle
                           (200,200,200)) #max
    
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
        self.last_pos = 0

    # In group motion methods
    @classmethod
    def updatePos(cls, time = None, speed = None):
        return LSS.updateGroup(time,speed)

    def setPos(self, angle = None):        
        pos = self.a2p(angle)
        if pos!=self.last_pos:
            self.last_pos = pos
            return self.lss.setPos(pos)

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

    def hold(self):
        self.lss.hold()

    def limp(self):
        self.lss.limp()

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
    
######################################## LEG CODE

class Leg:
    # Leg dimensions in millimeters
    L1 = 51
    L2 = 50
    L3 = 68
    foot_rad = 7
    DESKPET_LEG_MODEL = [0,0,-15.8] #joint adjustment in Deg for the leg kinematics model

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
        self.next_step = [0,0,0] # Walking foot coordinates relative to the rest leg position
        self.tp = [0,0,0]        # transition point from stance to swing trajectory

        # Distance from the leg to the body rotation point
        self.body_rot_distance = [0,0,0] 

        # Foot position offset respect the body center coordinate system
        self.foot_offset = [(offset_x if leg_id%2 == 0 else -offset_x),(-offset_y if self.rightLeg else offset_y),0]

        # Resting offsets
        self.rest_pos = [0,0,0]

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

            return (degrees(abduction_angle),degrees(rotation_angle),degrees(knee_angle)+Leg.DESKPET_LEG_MODEL[2])
        except:
            #print("Domain error calculating the inverse kinematics: LEG {}".format(self.leg_ID))
            return None

    def setPosIK(self,leg_coordinates):
        angles = self.inverseKinematics(*leg_coordinates) 
        if angles is not None: 
            self.joint[0].setPos(angles[0])
            self.joint[1].setPos(angles[1])
            self.joint[2].setPos(angles[2])
            return True
        return False

    def setPosDK(self,joint_angles):
        self.joint[0].setPos(joint_angles[0])
        self.joint[1].setPos(joint_angles[1])
        self.joint[2].setPos(joint_angles[2])

    def assembly(self): # Set the servo positions for assembly
        self.joint[0].setPos(0)
        self.joint[1].setPos(0)
        self.joint[2].setPos(90)

    def limp(self):
        for joint in self.joint:
            joint.limp()


######################################## BODY CODE

class Body:
    # Body dimensions in millimeters
    W = 50 # 52.6
    L = 108 # 110

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

        # Create a timer to control the frequency of motion execution
        self.motion_loop_timer = DTime(50) #ms

        # Crate and config the legs parameters for Deskpet
        self.legs = [Leg(leg_id=i,offset_x = 20,offset_y=Leg.L1-10) for i in range(1,5)]
        
        self.updateConfig()# Optimize it

        # Used to control the x, y and z displacement (height) with respect to the body orientation
        self.body_offsetB = (0,0,0)
        self.xb = SmoothMotionController(time_step_ms = self.motion_loop_timer.time, position_limit = (-30,30))
        self.yb = SmoothMotionController(time_step_ms = self.motion_loop_timer.time,position_limit = (-30,30))

        self.translation = (0,0,height)
        self.x = SmoothMotionController(time_step_ms = self.motion_loop_timer.time, position_limit = (-40,40))
        self.y = SmoothMotionController(time_step_ms = self.motion_loop_timer.time, position_limit = (-40,40))
        self.z = SmoothMotionController(initial_target_position = height, time_step_ms = self.motion_loop_timer.time,position_limit = (40,130))

        ## Used to balance the robot with respect to the body's point of rotation.
        self.balance_angles = [0,0,0]
        self.cog = [10,0,0]
        self.balance_matrix = [[0,0,0],[0,0,0],[0,0,0]]
        self.calcBalanceMatrix()
        # Activate balance function
        self.balance_function = 0

        # Roll Pitch and Yaw control variables
        angle_limits = (radians(-45),radians(45))
        self.roll = SmoothMotionController(time_step_ms = self.motion_loop_timer.time, position_limit = angle_limits)
        self.pitch = SmoothMotionController(time_step_ms = self.motion_loop_timer.time,position_limit = angle_limits)
        self.yaw = SmoothMotionController(time_step_ms = self.motion_loop_timer.time,position_limit = angle_limits)
        self.rpy_angles = (0,0,0)
        self.rpy_matrix = [[0,0,0],[0,0,0],[0,0,0]]  
        self.calcRPYMatrix()     

        self.assembly_mode = 0

        self.walk = Walking(self.legs,self.cog)

    def updatePos(self):
        if self.assembly_mode == 1:
            for leg in self.legs:
                leg.assembly()
            Joints.updatePos(self.motion_loop_timer.time)
            return

        if self.balance_function: 
            self.calcBalanceMatrix()

        self.calcRPYMatrix()
        self.body_offsetB = (self.xb.nextPosition(),self.yb.nextPosition(),0)
        self.translation = (self.x.nextPosition(),self.y.nextPosition(),self.z.nextPosition())

        self.walk.updateWalkStep()
        coordinates = []
        for leg in self.legs:
            foot_pos = subsVV(leg.rest_pos,self.cog)   
            balance_system = subsVV(multMV(self.balance_matrix,sumVV(leg.next_step,foot_pos)), self.translation)
            rot_point = subsVV(multMV(self.rpy_matrix,balance_system), self.body_offsetB )# RPY IMU entry data for balance / the point use the constant leg rest positionsince it is only for balance.
            
            coordinates = (-rot_point[0]+leg.body_rot_distance[0],-rot_point[2]+leg.body_rot_distance[1],-rot_point[1]+leg.body_rot_distance[2])

            if not leg.setPosIK(coordinates):
                # If the desired position is outside the domain of the kinematics function, no joint will be updated
                LSS.clearGroup() 
                return

        Joints.updatePos(self.motion_loop_timer.time)
        
    def updateConfig(self):
        for leg in self.legs:
            if leg.leg_ID == 1:
                leg.body_rot_distance = [Body.lr, 0, Body.wr][:]
                leg.rest_pos = [Body.lr, Body.wr, 0][:]
            elif leg.leg_ID == 2:
                leg.body_rot_distance = [Body.lf, 0, Body.wr][:]
                leg.rest_pos = [Body.lf, Body.wr, 0][:]
            elif leg.leg_ID == 3:
                leg.body_rot_distance = [Body.lr, 0, Body.wl][:]
                leg.rest_pos = [Body.lr, Body.wl, 0][:]
            elif leg.leg_ID == 4:
                leg.body_rot_distance = [Body.lf, 0, Body.wl][:]
                leg.rest_pos = [Body.lf, Body.wl, 0][:]
            else:
                raise ValueError("Wrong Leg ID")
            leg.rest_pos = sumVV(leg.rest_pos, leg.foot_offset)[:]

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
        a = self.roll.nextPosition() 
        b = self.pitch.nextPosition() 
        g = self.yaw.nextPosition() 

        self.rpy_angles = (a,b,g)

        self.rpy_matrix[0][0] = cos(b)*cos(g)
        self.rpy_matrix[0][1] = sin(a)*sin(b)*cos(b)-cos(a)*sin(g)
        self.rpy_matrix[0][2] = cos(a)*sin(b)*cos(g)+sin(a)*sin(g)

        self.rpy_matrix[1][0] = cos(b)*sin(g)
        self.rpy_matrix[1][1] = sin(a)*sin(b)*sin(g)+cos(a)*cos(g)
        self.rpy_matrix[1][2] = cos(a)*sin(b)*sin(g)-sin(a)*cos(g)

        self.rpy_matrix[2][0] = -sin(b)
        self.rpy_matrix[2][1] = sin(a)*cos(b)
        self.rpy_matrix[2][2] = cos(a)*cos(b)

    ######## CONTROL METHODS
    def assembly(self,val):
        self.assembly_mode = val
        for leg in self.legs:
            leg.assembly()
        Joints.updatePos(500) 

    def turnOff(self):
        for leg in self.legs:
            leg.limp()

    # Control Walking methods
    def walkingDirection(self,angle):
        Walking.changeAngle(angle)

    def walkingRotation(self,direction):
        Walking.changeRotDir(direction)

    def changeGait(self,type):
        if type == Gait.Static:
            Walking.changeGait(Walking.Static)
        elif type == Gait.Dynamic:
            Walking.changeGait(Walking.Dynamic)
        else:
            raise ValueError("Invalid Gait Type")
    
    def getCurrentGait(self):
        if(Walking.beta == Walking.Dynamic): #dynamic
            return Gait.Dynamic
        elif(Walking.beta == Walking.Static): #static
            return Gait.Static
        else:
            raise ValueError("Invalid Gait Type")
        
    def getWalkingAngles(self):
        return degrees(Walking.directing_angle)

    def getRotDir(self):
        return Walking.rot_direction

    # Robot modes methods
    def setBalance(self,active = 1):
        self.balance_function = active
        if not self.balance_function:
            self.balance_angles[0] = 0
            self.balance_angles[1] = 0
            self.balance_angles[2] = 0
            self.calcBalanceMatrix()

    def setTrot(self,active = 0):
        self.trot = active

    def isTrot(self):
        return Walking.trot
    
    # Body position controls
    def rpy(self, roll=None, pitch=None, yaw=None):
        if roll is not None:
            self.roll.updateTargetPosition(radians(roll), time_ms=self.motion_loop_timer.time)
        if pitch is not None:
            self.pitch.updateTargetPosition(radians(pitch), time_ms=self.motion_loop_timer.time)
        if yaw is not None:
            self.yaw.updateTargetPosition(radians(yaw), time_ms=self.motion_loop_timer.time)

    def xyz(self, x=None, y=None, z=None):
        if x is not None:
            self.x.updateTargetPosition(x, time_ms=self.motion_loop_timer.time)
        if y is not None:
            self.y.updateTargetPosition(y, time_ms=self.motion_loop_timer.time)
        if z is not None:
            self.z.updateTargetPosition(z, time_ms=self.motion_loop_timer.time)

    def xyBody(self, xb=None, yb=None):
        if xb is not None:
            self.xb.updateTargetPosition(xb, time_ms=self.motion_loop_timer.time)
        if yb is not None:
            self.yb.updateTargetPosition(yb, time_ms=self.motion_loop_timer.time)
    
    def specialMove(self,move = 0): ## NOT IMPLEMENTED YET
        pass

    # private method
    def motionLoop(self):
        if self.motion_loop_timer.getDT():
            self.updatePos()   

######################################## WALKING CODE

class Walking:

    # Step size variables
    bh = 0
    sh = 30
    sl = 40

    Dynamic = 1
    Static = 3

    # Gait variables
    beta = Dynamic # 1 for dynamic and 3 for static gait
    swing_traj_points = 4 # 4 is the minimun point to describe the swing trajectory
    stance_traj_points = swing_traj_points*beta
    trajectory_points = (1+beta)*swing_traj_points # Number of points for a complete trajectory cycle
    gait_phase = trajectory_points/(beta+1)
    dstep = sl/(swing_traj_points*beta) # Distance to be moved between points of the stance stage

    move_rot_angle = 20
    rot_astep = move_rot_angle/stance_traj_points

    dynamic_leg_sequence = [2,1,3,0] # Position of the list is the leg ID and the content is the order to move
    static_leg_sequence = [3,0,1,2]
    leg_sequence = dynamic_leg_sequence if beta == 1 else static_leg_sequence
    trot = 0
    angle_field = 30

    # Counter
    counter = 0 # Next trajectory sample point

    # Stop sequence variables
    seq_counter = 0
    num_cycles = 2
    seq_num = 1
    walk_update_flag = False

    # Rotation stop sequence variables
    rot_seq_counter = 0
    rot_num_cycles = 2
    rot_seq_num = 1
    rot_update_flag = False

    # Gait type
    gait_update_flag = True
    new_gait = beta

    # Control variables
    directing_angle = 0 #radians(90) ## 90 deg is default forward direction - 0: STOP
    new_directing_angle = radians(90)

    rot_direction = 0 # 0: STOP, 1:CW, -1:CCW
    new_rot_direction = 1 


    def __init__(self, legs:list, cog:list):

        self.legs = legs
        self.cog = cog
        
        self.dp = [0,0,0] # Desired point
        self.rot_distance = [0,0,0] # Foot travel distance required for the robot to rotate

    def swingStage(self,counter,leg): # Air
        new_point = [0,0,0]
        foot_pos = subsVV(leg.rest_pos,self.cog)
        
        if(Walking.directing_angle != 0):
            half_sl = Walking.seq_num*(Walking.sl/2)/Walking.num_cycles
            new_point[0] = half_sl*sin(Walking.directing_angle) 
            new_point[1] = -1*half_sl*cos(Walking.directing_angle)           

        if(Walking.rot_direction != 0):
            temp = sumVV(new_point,foot_pos)
            angle = Walking.rot_seq_num *(Walking.move_rot_angle/2)/Walking.rot_num_cycles
            temp2 = multMV(calcRotMatrix(-1*Walking.rot_direction*angle),temp)
            new_point = subsVV(temp2,foot_pos)

        self.dp[1] = -cos((counter+1)*pi/4)*(new_point[1] if counter>0 else -leg.tp[1])
        self.dp[0] = -cos((counter+1)*pi/4)*(new_point[0] if counter>0 else -leg.tp[0])

        if(Walking.directing_angle!=0 or Walking.rot_direction != 0):
            self.dp[2] = sin((counter+1)*pi/4)*Walking.sh
            if counter == 3: # tries to reduce the impact against the ground
                self.dp[2]+=3
        else:
            self.dp[2] = 0
               
    def stanceStage(self,counter,leg): # Floor
        new_point = [0,0,0]
        foot_pos = subsVV(leg.rest_pos,self.cog)

        if(Walking.directing_angle!=0):
            step = Walking.seq_num * Walking.dstep / Walking.num_cycles
            new_point = [step*sin(Walking.directing_angle),-1*step*cos(Walking.directing_angle),0]
        
        self.dp[0] -= new_point[0]
        self.dp[1] -= new_point[1]
        
        angle = Walking.rot_seq_num*(Walking.rot_direction*Walking.rot_astep)/Walking.rot_num_cycles
        self.dp = subsVV(multMV(calcRotMatrix(angle),sumVV(self.dp,foot_pos)),foot_pos)
        
        const_phase = pi/(4*Walking.beta)
        if((Walking.directing_angle!=0 or Walking.rot_direction != 0) and Walking.beta==1) or Walking.trot:
            self.dp[2] = Walking.bh*sin((counter-3)*const_phase)
        else:
            self.dp[2] = 0

        #self.dp[2] = 0
        leg.tp = self.dp[:] #valid for the last point
        
    def getLegCounter(self,leg_ID):
        return (int(Walking.counter+(Walking.gait_phase*Walking.leg_sequence[leg_ID-1]))%Walking.trajectory_points)
    
    def updateWalkStep(self):
        if self.beta == 3:
            if Walking.rot_direction != 0 or Walking.directing_angle != 0 or self.cog[1] != 0:
                self.cog[1] = 5*sin((self.counter)*pi/8)

        # Walking Stop/Start Sequence
        if(Walking.directing_angle != 0):
            if(0 <= Walking.seq_num < Walking.num_cycles): 
                Walking.seq_counter +=1
                if(Walking.seq_counter > Walking.trajectory_points):
                    if Walking.seq_num == 0:
                        Walking.directing_angle = 0
                    else:
                        if Walking.new_directing_angle == 0: 
                            Walking.seq_num -= 1 # Is stopping
                        else:
                            Walking.seq_num += 1 # It starting
                        
                    Walking.seq_counter = 0
        
        # Walking Stop/Start Sequence for ROTATION MOVE
        if(Walking.rot_direction != 0):
            if(0 <= Walking.rot_seq_num < Walking.rot_num_cycles): 
                Walking.rot_seq_counter +=1
                if(Walking.rot_seq_counter > Walking.trajectory_points):
                    if Walking.rot_seq_num == 0:
                        Walking.rot_direction = 0
                    else:
                        if Walking.new_rot_direction == 0: 
                            Walking.rot_seq_num -= 1 # Is stopping
                        else:
                            Walking.rot_seq_num += 1 # It starting
                        
                    Walking.rot_seq_counter = 0

        for leg in self.legs:
            counter = self.getLegCounter(leg.leg_ID)

            self.dp = leg.next_step[:]

            if(Walking.gait_update_flag and counter == 1):
                self._updateGait()
            if(Walking.walk_update_flag):
                if(Walking.isLegSide(leg.leg_ID) and counter == 1):
                    Walking.updateParams()
            if(Walking.rot_update_flag and counter == 1):
                if(Walking.new_rot_direction == Rotation.CCW and (leg.leg_ID == 3 or leg.leg_ID == 4)):
                    Walking.updateParams()
                elif(Walking.new_rot_direction == Rotation.CW and (leg.leg_ID == 1 or leg.leg_ID == 2)):
                    Walking.updateParams()
                elif Walking.new_rot_direction == Rotation.STOP:
                    Walking.updateParams()
            
            if counter < 3:
                self.swingStage(counter,leg)
            elif counter == 3:
                # At this point the foot should have been reach the desired point
                self.swingStage(counter,leg)
                #self.cp = self.next_point
            else: # stance stage
                self.stanceStage(counter,leg)
            
            leg.next_step = self.dp[:]

        Walking.updateSequence()

    @classmethod
    def isLegSide(cls,leg_ID):
        if cls.new_directing_angle == 0:
            return True
        if (leg_ID == 1):
            if((270 - cls.angle_field <= degrees(cls.new_directing_angle) <= 360) or (1 <= degrees(cls.new_directing_angle) <= cls.angle_field)):
                return True
        elif (leg_ID == 2):
            if((1 <= degrees(cls.new_directing_angle) <= 90 + cls.angle_field) or (360 - cls.angle_field <= degrees(cls.new_directing_angle) <= 360)):
                return True
        elif (leg_ID == 3):
            if(180 - cls.angle_field <= degrees(cls.new_directing_angle) <= 270 + cls.angle_field):
                return True
        elif (leg_ID == 4):
            if(90 - cls.angle_field <= degrees(cls.new_directing_angle) <= 180 + cls.angle_field):
                return True
        else:
            return False

    @classmethod
    def updateSequence(cls):
        cls.counter +=1
        if cls.counter >= cls.trajectory_points:
            cls.counter = 0

    @classmethod
    def changeStepSize(cls,step_height = None, step_length = None):
        if step_height is not None:
            cls.sh = step_height
        if step_length is not None:
            cls.sl = step_length      
    
    @classmethod
    def _updateGait(cls):
        #change phase an in order to doo that increase the number point of the trajectory also need to change
        cls.gait_update_flag = False
        cls.beta = cls.new_gait
        if cls.beta == cls.Dynamic:
            cls.leg_sequence = cls.dynamic_leg_sequence 
        elif cls.beta == cls.Static:
            cls.leg_sequence = cls.static_leg_sequence

        cls.trajectory_points = (1+cls.beta)*cls.swing_traj_points # Number of points for a complete trajectory cycle
        cls.gait_phase = cls.trajectory_points/(cls.beta+1)
        cls.dstep = cls.sl/(cls.swing_traj_points*cls.beta) # Distance to be moved between points of the stance stage

    @classmethod
    def updateParams(cls):
        if(cls.walk_update_flag):
            cls.walk_update_flag = False
            if cls.new_directing_angle == 0:
                cls.seq_num = cls.num_cycles-1
                return
            
            angle_dif = abs(cls.directing_angle%360 - cls.new_directing_angle%360) 
            if angle_dif > 180:
                angle_dif = 360 - angle_dif

            if angle_dif > 3*pi/4: #Hard change of direction 120 deg
                cls.seq_num = cls.num_cycles-1

            cls.directing_angle = cls.new_directing_angle
            if cls.seq_num == 0:
                cls.seq_num = 1 #start sequence
        
        if(cls.rot_update_flag):
            cls.rot_update_flag = False
            if cls.new_rot_direction == 0:
                cls.rot_seq_num = cls.rot_num_cycles-1
                return

            if (cls.rot_direction + cls.rot_direction) == 0: #Hard change of direction
                cls.rot_seq_num = cls.rot_num_cycles-1

            cls.rot_direction = cls.new_rot_direction
            if cls.rot_seq_num == 0:
                cls.rot_seq_num = 1 #start sequence

    @classmethod
    def changeAngle(cls,new_angle):
        cls.walk_update_flag = True
        cls.new_directing_angle = radians(new_angle)

    @classmethod
    def changeRotDir(cls,dir):
        if Rotation.isValid(dir):
            cls.rot_update_flag = True
            cls.new_rot_direction = dir

    @classmethod
    def changeGait(cls,gait_type):
        if gait_type == 1 or gait_type == 3:
            cls.gait_update_flag = True
            cls.new_gait = gait_type

