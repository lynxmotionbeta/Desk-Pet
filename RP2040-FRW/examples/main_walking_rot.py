'''
 * Authors:    Eduardo Nunes 
 * Version:    1.0
 * Licence:    LGPL-3.0 (GNU Lesser General Public License)
 *
 * Description: Walking and rotation sample code using the API.
'''

from src.api import API
from src.utils import DTime
from src.constants import Walking,Rotation

############## WALKING EXAMPLE

deskpet = API()

def routine0():
    print("walk forward")
    deskpet.walk(Walking.FORWARD)

def routine1():
    print("stop")
    deskpet.walk(Walking.STOP)

def routine2():
    print("walk backward")
    deskpet.walk(Walking.BACKWARD)

def routine3():
    print("walk right")
    deskpet.walk(Walking.RIGHT)

def routine4():
    print("walk left")
    deskpet.walk(180)

def routine5():
    print("stop")
    deskpet.walk(0)

def routine6():
    print("walk NE")
    deskpet.walk(45)

def routine7():
    print("walk left")
    deskpet.walk(360)

def routine8():
    print("STOP")
    deskpet.walk(Walking.STOP)

def routine9():
    print("CW")
    deskpet.rotate(1)

def routine10():
    print("CCW")
    deskpet.rotate(-1)

def routine11():
    print("STOP")
    deskpet.rotate(Rotation.STOP)


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
    routine11
]

routine_time_ms = 5000 # 4 seconds

current_routine = 0

update_routine = DTime(routine_time_ms)

def main():
    global demo_routines
    global current_routine
    global update_routine
    
    while(True):
        if(update_routine.getDT()):
            try:
                demo_routines[current_routine]()
                current_routine +=1
            except: 
                break


if __name__ == "__main__":
    main()

