'''
 * Authors:    Eduardo Nunes 
 * Version:    1.0
 * Licence:    LGPL-3.0 (GNU Lesser General Public License)
 *
 * Description: Sample code for body movement control using the API.
'''

from src.api import API
from src.utils import DTime
from src.constants import Walking,Rotation

############## MOVES EXAMPLE

deskpet = API()

def routine0():
    print("Roll 15 deg")
    deskpet.setRPYAngles(roll = 15)

def routine1():
    print("Roll 0 deg")
    deskpet.setRPYAngles(roll = 0)

def routine2():
    print("Pitch 15 deg")
    deskpet.setRPYAngles(pitch= 15)

def routine3():
    print("Pitch 0 deg")
    deskpet.setRPYAngles(pitch= 0)

def routine4():
    print("Yaw 15 deg")
    deskpet.setRPYAngles(yaw= 15)

def routine5():
    print("Yaw 0 deg")
    deskpet.setRPYAngles(yaw= 0)

def routine6():
    print("Roll 5 deg")
    deskpet.setRPYAngles(roll= 10)

def routine7():
    print("Yaw -20 deg")
    deskpet.setRPYAngles(yaw= -20)

def routine8():
    print("X axis displacement 20 mm")
    deskpet.setXYZ(x= 20)
    print("XYZ",deskpet.getXYZ())

def routine9():
    print("X axis displacement at 0 mm (origin)")
    deskpet.setXYZ(x= 0)

def routine10():
    print("Y axis displacement 20 mm")
    deskpet.setXYZ(y= 20)

def routine11():
    print("Y axis displacement at 0 mm (origin)")
    deskpet.setXYZ(y= 0)

def routine12():
    print("Frontal displacement in body orientation, 20 mm")
    deskpet.setXYBody(xb = 20)

def routine13():
    print("Frontal displacement in body orientation, to origin")
    deskpet.setXYBody(xb = 0)

def routine14():
    print("change the height to 110 mm")
    deskpet.setXYZ(z=110)

def routine15():
    print("change the height to 80 mm")
    deskpet.setXYZ(z=80)

def routine16():
    print("change the height to 90 mm")
    deskpet.setXYZ(z=90)

def routine17():
    print("Returns to rest position")
    deskpet.setRPYAngles(yaw = 0, roll = 0, pitch = 0)


demo_routines = [
    routine0,
    routine1,
    routine2,
    routine3,
    routine4,
    routine5,
    routine6,
    routine7,
    routine8,
    routine9,
    routine10,
    routine11,
    routine12,
    routine13,
    routine14,
    routine15,
    routine16,
    routine17
]

routine_time_ms = 2000 # 2seconds

current_routine = 0

update_routine = DTime(routine_time_ms)

def main():
    global demo_routines
    global current_routine
    global update_routine
    
    print(" > Starting demo")
    while(True):
        if(update_routine.getDT()):
            try:
                demo_routines[current_routine]()
                current_routine +=1
                pass
            except:
                print(" > Demo completed")
                break


if __name__ == "__main__":
    main()


