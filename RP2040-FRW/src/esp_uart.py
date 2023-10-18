'''
 * Authors:    Eduardo Nunes
 * Version:    1.0
 * Licence:    LGPL-3.0 (GNU Lesser General Public License)
 *
 * Description: Library to control the basic functions of uart assigned for communication with ESP in the Lynxmotion DeskPet robot.
'''

from machine import UART,Pin
from src.constants import CommErrorCode 

end_char = b'\r'
start_char = b'#'

class ESPUART:

    def __init__(self, bauds = 115200, tx = 0, rx = 1, uart = 0):
        self._esp_comm = UART(uart,bauds,tx = Pin(tx), rx=Pin(rx))
        self.bauds = bauds
        #self.buffer = CircularBuffer(5)

        self.raw_cmd = ""

        self.msg_status = CommErrorCode.OK

    def isMsg(self):
        if self._esp_comm.any():
            self.raw_cmd = self._esp_comm.read()
            if self.raw_cmd is not None:
                if self.raw_cmd[0] == start_char and self.raw_cmd[-1] == end_char:
                    if not (b'0'<= self.raw_cmd[1] <= b'9'):
                        self.raw_cmd = self.raw_cmd[1:-1]
                        return True
                    #else:
                        # # decode msg to know if it is query
                        # # write the msg -> LSS.bus.write(self.raw_cmd.encode())
                        # # wait for the answer if it is necessar
                        # # if it is a query, resend the answer for the ESP UART
                        #print("it is a command for the ATMEGA", self.raw_cmd)
        return False

    def reply(self,cmd):
        self._esp_comm.write(cmd)