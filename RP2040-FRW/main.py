from machine import UART
import lss_const as lssc
from lss import LSS
from time import sleep_ms
from math import cos, sin, radians, degrees, pi
import utime
import config as cfg
from kinematics import Joints, Leg, Body, Walking
import urandom

import utils as ut

h = 100
time = 300
balance_matrix = [[0,0,0],[0,0,0],[0,0,0]]

def setBalancedPos():
    a = radians(0)
    b = radians(0)
    g = radians(20)

    balance_matrix[0][0] = cos(b)*cos(g)
    balance_matrix[0][1] = sin(a)*sin(b)*cos(b)-cos(a)*sin(g)
    balance_matrix[0][2] = cos(a)*sin(b)*cos(g)+sin(a)*sin(g)

    balance_matrix[1][0] = cos(b)*sin(g)
    balance_matrix[1][1] = sin(a)*sin(b)*sin(g)+cos(a)*cos(g)
    balance_matrix[1][2] = cos(a)*sin(b)*sin(g)-sin(a)*cos(g)

    balance_matrix[2][0] = -sin(b)
    balance_matrix[2][1] = sin(a)*cos(b)
    balance_matrix[2][2] = cos(a)*cos(b)

def main ():
    LSS.initBus()
    ESPCOM = UART(0, 115200)
    deskpet = Body(height = h, rot_point_x = 0, rot_point_y = 0)

    
    Joints.joint_calibration_offset = [[5,-11,5],   # Leg 1
                                        [-9,-9,9 ],   # Leg 2
                                        [10,-7,-5],   # Leg 3
                                        [10,2,7]]   # Leg 4  
    

    start_time = utime.ticks_ms()
    step = 0.1
    deskpet.balance_angles = (0,0,0)
    deskpet.cog = (15,0,0)
    deskpet.updatePos(time)

    #deskpet.assembly()
    setBalancedPos()
    print(balance_matrix)
    

    end_time = utime.ticks_ms()
    elapsed_time = utime.ticks_diff(end_time, start_time)
    print("Tiempo de ejecución: ", elapsed_time, "ms")
    
    def routine0():
        print("walk right")
        deskpet.walkingDirection(360)

    def routine1():
        print("walk backward")
        deskpet.walkingDirection(270)

    def routine2():
        print("walk left")
        deskpet.walkingDirection(180)

    def routine3():
        print("walk forward")
        deskpet.walkingDirection(90)

    def routine4():
        print("walk backward")
        deskpet.walkingDirection(270)

    def routine5():
        print("walk 45")
        deskpet.walkingDirection(45)

    def routine6():
        print("walk left")
        deskpet.walkingDirection(180)

    def routine7():
        print("walk 315")
        deskpet.walkingDirection(315)

    # Diccionario de estados y funciones
    routines = {
        0: routine0,
        1: routine1,
        2: routine2,
        3: routine3,
        4: routine4,
        5: routine5,
        6: routine6,
        7: routine7
    }

    current_routine = 0

    update_routine = ut.DTime(5000)

    dt = ut.DTime(time)
    while(True):
        
        if(dt.getDT()):
            pass

            if(update_routine.getDT()):
                #routines[current_routine]()
                current_routine +=1
                
            deskpet.updatePos(time)

        
        # # ESP Communication testing
        # if (ESPCOM.any()): 
        #     # Get packet
        #     lss_packet = ESPCOM.read()
        #     data = lss_packet.decode("utf-8")
        #     if data.startswith('#'):
        #         data = data[1:-1]
        #         print(data)
        #         if("QV"in data):
        #             msg_cmd = '*'+data+str(urandom.randint(6400, 8400))+'\r'
        #             #msg_cmd = "*QV8000\r"
        #             print(msg_cmd)
        #             ESPCOM.write(msg_cmd)
            
        # # Parse packet
        # if data.startswith('*'):
        #     data = data[1:-1]
        #     values = data.split(cmd)
        #     try:
        #         readID = int(values[0])
        #         if (readID != id):
        #             print("Wrong ID")
        #             return None
        #     except:
        #         print("Bad CMD")
        #         return None
        #     try:
        #         readValue = int(values[1])
        #     except:
        #         print("Bad CMD")
        #         return None

    # servo = LSS(id = 10)   
    # aa = 270 
    # pp = (1000*aa/300) +1000
    # servo.moveP(pp)


    # # move in circle
    # while(True):
    #     cont += 1
    #     yaw = 10*cos(step*cont)# + Leg.L1
    #     pitch = 10*sin(step*cont)# + 90
    #     coord = (0,pitch,yaw)

    #     #updatePos(rpy, height, xb,yb,xf,yf, time = 100)
    #     #deskpet.updatePos(rpy=coord,height=80,xb=0,yb=0,x=0,y=0,time=time)

    #     sleep_ms(time)
    #     break



    # for l in range(4):
    #     for j in range(1):
    #         joint[l][j].move(0,2000)

    # Calibration
    # for l in range(4):       
    #     joint[l][0].move(0,2000)
            
    # for l in range(4):       
    #     joint[l][1].move(0,2000)
     
    # for l in range(4):       
    #     joint[l][2].move(90,2000)
         
if __name__ == "__main__":
    main()

