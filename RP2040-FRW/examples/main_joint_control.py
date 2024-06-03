'''
 * Authors:    Eduardo Nunes
 * Version:    1.0
 * Licence:    LGPL-3.0 (GNU Lesser General Public License)
 *
 * Description: Example code for the assembly and calibration of the Lynxmotin DeskPet robot using the API.
'''
from lib.lss import LSS
from src.kinematics import Leg, Joints


LSS.initBus()

leg1 = Leg(leg_id=1)
leg2 = Leg(leg_id=2)
leg3 = Leg(leg_id=3)
leg4 = Leg(leg_id=4)

Joints.joint_calibration_offset = [[-7, 2, 3], [2, 11, 1], [-1, 9, 1], [7, 9, -13]]

leg1.setPosDK((0,90,140))
leg2.setPosDK((0,90,140))
leg3.setPosDK((0,90,140))
leg4.setPosDK((0,90,140))

Joints.updatePos(2000)
