'''
 * Authors:    Eduardo Nunes
 * Version:    1.0
 * Licence:    LGPL-3.0 (GNU Lesser General Public License)
 *
 * Description: Example code for the assembly and calibration of the Lynxmotin DeskPet robot using the API.
'''

from src.api import API

deskpet = API()

def main():
    deskpet.enableAssembly()
    #args #leg, #joint, angle in degrees

    # Once assembled, adjust the angles in degrees to match the desired position.

    # Leg 1 (rear-right)
    deskpet.setJointOffset(1, 1, 0)
    deskpet.setJointOffset(1, 2, 0)
    deskpet.setJointOffset(1, 3, 0)

    # Leg 2 (front-right)
    deskpet.setJointOffset(2, 1, 0)
    deskpet.setJointOffset(2, 2, 0)
    deskpet.setJointOffset(2, 3, 0)

    # Leg 3 (rear-left)
    deskpet.setJointOffset(3, 1, 0)
    deskpet.setJointOffset(3, 2, 0)
    deskpet.setJointOffset(3, 3, 0)

    # Leg 4 (front-left)
    deskpet.setJointOffset(4, 1, 0)
    deskpet.setJointOffset(4, 2, 0)
    deskpet.setJointOffset(4, 3, 0)
    
    #deskpet.disableAssembly()
    
if __name__ == "__main__":
    main()
    
