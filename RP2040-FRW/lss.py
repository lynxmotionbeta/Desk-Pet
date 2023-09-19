###############################################################################
#	Author:			Sebastien Parent-Charette (support@robotshop.com)
#	Version:		1.0.0
#	Licence:		LGPL-3.0 (GNU Lesser General Public License version 3)
#	
#	Desscription:	A library that makes using the LSS simple.
#					Offers support for most Python platforms.
#					Uses the Python serial library (pySerial).
###############################################################################

### Import required liraries
from machine import Pin, Timer, UART
import re

from math import sqrt, atan, acos, fabs
import time

### Import constants
import lss_const as lssc

import utime

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

	print(command)
	LSS.bus.write(command.encode())
    
    #return True

# Read an integer result
def genericRead_Blocking_int(id, cmd):

	while not LSS.bus.any(): ##  >>>>>>>>>>> ADD timeout
		pass

	# Get packet
	lss_packet = LSS.bus.read()
	data = lss_packet.decode("utf-8")
	# Parse packet
	if data.startswith('*'):
		data = data[1:-1]
		values = data.split(cmd)
		try:
			readID = int(values[0])
			if (readID != id):
				print("Wrong ID")
				return None
		except:
			print("Bad CMD")
			return None
		try:
			readValue = int(values[1])
		except:
			print("Bad CMD")
			return None

		# return value
		return(readValue)
	else:
		return None

# Read a string result
#@classmethod
def genericRead_Blocking_str(id, cmd, numChars):
	try:
		# Get start of packet and discard header and everything before
		c = LSS.bus.read()
		while (c.decode("utf-8") != lssc.LSS_CommandReplyStart):
			c = LSS.bus.read()
			if(c.decode("utf-8") == ""):
				break
		# Get packet
		data = LSS.bus.read_until(lssc.LSS_CommandEnd.encode('utf-8')) #Otherwise (without ".encode('utf-8')") the received LSS_CommandEnd is not recognized by read_until, making it wait until timeout.
		data = (data[:-1])
		# Parse packet
		matches = re.match("(\d{1,3})([A-Z]{1,4})(.{" + str(numChars) + "})", data.decode("utf-8"), re.I)
		# Check if matches are found
		if(matches is None):
			return(None)
		if((matches.group(1) is None) or (matches.group(2) is None) or (matches.group(3) is None)):
			return(None)
		# Get values from match
		readID = matches.group(1)
		readIdent = matches.group(2)
		readValue = matches.group(3)
		# Check id
		if(readID != str(id)):
			return(None)
		# Check identifier
		if(readIdent != cmd):
			return(None)
	except:
		return(None)
	# return value
	return(readValue)

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
		if LSS.bus is None:
			raise Exception("Error, LSS bus not assigned")	
		if time:
			LSS.cmd_list.extend([lssc.LSS_ActionParameterTime,time,"\r"])
		elif speed:
			LSS.cmd_list.extend([lssc.LSS_ActionParameterSpeed,speed,"\r"])
		else:
			LSS.cmd_list.extend("\r")
		
		LSS.mgcmd = ''.join([str(element) if isinstance(element, int) else element for element in LSS.cmd_list])

		LSS.bus.write(LSS.mgcmd.encode())
		LSS.cmd_list = []
	
	def setPos(self,pulses):
		LSS.cmd_list.extend(["#",self.str_ID,"P",pulses])
	
	def getFirmwareVersion(self):
		genericWrite(LSS.boardID, lssc.LSS_QueryFirmwareVersion)
		return (genericRead_Blocking_int(LSS.boardID, lssc.LSS_QueryFirmwareVersion))
	
	def getVoltage(self):
		genericWrite(LSS.boardID, lssc.LSS_QueryVoltage)
		return (genericRead_Blocking_int(LSS.boardID, lssc.LSS_QueryVoltage))	

	#> Actions
	def limp(self):
		return (genericWrite(self.servoID, lssc.LSS_ActionLimp))
	
	def hold(self):
		return (genericWrite(self.servoID, lssc.LSS_ActionHold))

	def moveP(self, pos):
		return (genericWrite(self.servoID, lssc.LSS_ActionMovePulse, pos))
	
	def movePT(self, pos, time):
		return (genericWrite(self.servoID, lssc.LSS_ActionMovePulse, pos, lssc.LSS_ActionParameterTime, time))
	
	def moveD(self, pos):
		return (genericWrite(self.servoID, lssc.LSS_ActionMoveDeg, pos))
	
	#> Queries
	def getID(self):
		return self.servoID

	#def getBaud(self):
	
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
	
	def getSpeed(self):
		genericWrite(self.servoID, lssc.LSS_QuerySpeed)
		return (genericRead_Blocking_int(self.servoID, lssc.LSS_QuerySpeed))
	
	def getSerialNumber(self):
		genericWrite(self.servoID, lssc.LSS_QuerySerialNumber)
		return (genericRead_Blocking_int(self.servoID, lssc.LSS_QuerySerialNumber))
	
	def getCurrent(self):
		genericWrite(self.servoID, lssc.LSS_QueryCurrent)
		return (genericRead_Blocking_int(self.servoID, lssc.LSS_QueryCurrent))
	
	#> Configs
	def setMaxSpeed(self, speed, setType = lssc.LSS_SetSession):
		if setType == lssc.LSS_SetSession:
			return (genericWrite(self.servoID, lssc.LSS_ActionMaxSpeed, speed))
		elif setType == lssc.LSS_SetConfig:
			return (genericWrite(self.servoID, lssc.LSS_ConfigMaxSpeed, speed))
	
	def setMaxSpeedRPM(self, rpm, setType = lssc.LSS_SetSession):
		if setType == lssc.LSS_SetSession:
			return (genericWrite(self.servoID, lssc.LSS_ActionMaxSpeedRPM, rpm))
		elif setType == lssc.LSS_SetConfig:
			return (genericWrite(self.servoID, lssc.LSS_ConfigMaxSpeedRPM, rpm))

	
### EOF #######################################################################
