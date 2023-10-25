###############################################################################
#	Original Author:	Sebastien Parent-Charette (support@robotshop.com)
#	Modified By:		Eduardo Nunes 
#	Version:		1.0.0 (Original), 1.1.0 (Modified)
#	Licence:		LGPL-3.0 (GNU Lesser General Public License version 3)
#	
#	Description:	A library that makes using the LSS simple.
#					This version has been modified for compatibility with MicroPython.
#					Added functions to control servos in groups for the Lynxmotion DeskPet robot.
###############################################################################


### Import required liraries
from machine import Pin, UART

### Import constants
import lib.lss_const as lssc

from src.utils import DTime

timeout_timer = DTime(10) # 10 ms

### Class functions

# Write with a an optional parameter
def genericWrite(id, cmd, param=None, modifier=None, value=None):
	if LSS.bus is None:
		raise Exception("Error, LSS bus not assigned")
	command = f"{lssc.LSS_CommandStart}{id}{cmd}"
	
	if param is not None:
		command += str(param)

		if modifier and value:
			command += f"{modifier}{value}"

	command += lssc.LSS_CommandEnd
	
	LSS.bus.write(command.encode())

# Read an integer result
def genericRead_Blocking_int(id, cmd):

	timeout_timer.reset()
	while not LSS.bus.any(): ## 
		if timeout_timer.getDT():
			return None

	# Get packet
	lss_packet = LSS.bus.read()
	data = lss_packet.decode("utf-8")
	# Parse packet
	if data.startswith('*'):
		data = data[1:-1]
		values = data.split(cmd)
		if id != LSS.boardID:
			try:
				readID = int(values[0])
				if (readID != id):
					#print("Wrong ID")
					return None
			except:
				#print("Bad CMD")
				return None
		try:
			readValue = int(values[1])
		except:
			#print("Bad CMD")
			return None

		# return value
		return(readValue)
	else:
		return None

class LSS:
	# Class attribute
	boardID = 255
	bus = None
	mgcmd = ""
	cmd_list = []
	### Constructor
	def __init__(self, id = 0):
		self.servoID = id
		self.str_ID = str(id)
	
	@classmethod
	def initBus(cls,portName = 1, portBaud = 115200, tx_pin = 4, rx_pin = 5):
		cls.bus = UART(portName, portBaud, tx = Pin(tx_pin), rx=Pin(rx_pin))

	@classmethod
	def closeBus(cls):
		if cls.bus is not None:
			cls.bus.deinit()
			cls.bus = None

	### Methods
	# Special group methods
	@classmethod
	def clearGroup(self):
		LSS.cmd_list = []

	@classmethod
	def updateGroup(cls, time=None, speed=None):
		if not cls.cmd_list:
			return
		if cls.bus is None:
			raise Exception("Error, LSS bus not assigned")	
		if time:
			cls.cmd_list.extend([lssc.LSS_ActionParameterTime,time,"\r"])
		elif speed:
			cls.cmd_list.extend([lssc.LSS_ActionParameterSpeed,speed,"\r"])
		else:
			cls.cmd_list.extend("\r")
		
		LSS.mgcmd = ''.join([str(element) if isinstance(element, int) else element for element in LSS.cmd_list])

		LSS.bus.write(LSS.mgcmd.encode())
		LSS.cmd_list = []
	
	def setPos(self,pulses):
		LSS.cmd_list.extend(["#",self.str_ID,"P",pulses])
	
	@staticmethod
	def getFirmwareVersion():
		genericWrite(LSS.boardID, lssc.LSS_QueryFirmwareVersion)
		return (genericRead_Blocking_int(LSS.boardID, lssc.LSS_QueryFirmwareVersion))
	
	@staticmethod
	def getVoltage():
		genericWrite(LSS.boardID, lssc.LSS_QueryVoltage)
		v = genericRead_Blocking_int(LSS.boardID, lssc.LSS_QueryVoltage)
		
		return 0 if v is None else v

	#> Actions
	def limp(self):
		return (genericWrite(self.servoID, lssc.LSS_ActionLimp))
	
	def hold(self):
		return (genericWrite(self.servoID, lssc.LSS_ActionHold))

	def moveP(self, pos, time = None):
		if time is None:
			return (genericWrite(self.servoID, lssc.LSS_ActionMovePulse, pos))
		return (genericWrite(self.servoID, lssc.LSS_ActionMovePulse, pos, lssc.LSS_ActionParameterTime, time))
	
	def moveD(self, pos):
		return (genericWrite(self.servoID, lssc.LSS_ActionMoveDeg, pos))
	
	#> Queries
	def getID(self):
		return self.servoID
	
	def getStatus(self):
		genericWrite(self.servoID, lssc.LSS_QueryStatus)
		return (genericRead_Blocking_int(self.servoID, lssc.LSS_QueryStatus))
	
	def getPositionPulse(self):
		genericWrite(self.servoID, lssc.LSS_QueryPositionPulse)
		return (genericRead_Blocking_int(self.servoID, lssc.LSS_QueryPositionPulse))
	
	def getPositionMV(self):
		genericWrite(self.servoID, lssc.LSS_QueryPositionMV)
		return (genericRead_Blocking_int(self.servoID, lssc.LSS_QueryPositionMV))
	
	def getPosition(self):
		genericWrite(self.servoID, lssc.LSS_QueryPosition)
		return (genericRead_Blocking_int(self.servoID, lssc.LSS_QueryPosition))
	
	def getCurrent(self):
		genericWrite(self.servoID, lssc.LSS_QueryCurrent)
		return (genericRead_Blocking_int(self.servoID, lssc.LSS_QueryCurrent))
	
	#> Configs


	
### EOF #######################################################################
