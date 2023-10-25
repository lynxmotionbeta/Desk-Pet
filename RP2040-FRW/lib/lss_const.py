###############################################################################
#	Original Author:	Sebastien Parent-Charette (support@robotshop.com)
#	Modified By:		Eduardo Nunes
#	Version:		1.0.0 (Original), 1.1.0 (Modified)
#	Licence:		LGPL-3.0 (GNU Lesser General Public License version 3)
#	
#	Description:	A library that makes using the LSS simple.
#   				This version has been modified for compatibility with MicroPython.
#   				Added functions to control servos in groups for the Lynxmotion DeskPet robot.
###############################################################################

### List of constants

# Bus communication
LSS_DefaultBaud = 115200
LSS_MaxTotalCommandLength = (30 + 1)	# ex: #999XXXX-2147483648\r Adding 1 for end string char (\0)
#										# ex: #999XX000000000000000000\r
LSS_Timeout = 100						# in ms
LSS_CommandStart = "#"
LSS_CommandReplyStart = "*"
LSS_CommandEnd = "\r"
LSS_FirstPositionDisabled = "DIS"

# LSS constants
LSS_ID_Default = 0
LSS_ID_Min = 0
LSS_ID_Max = 250
LSS_Mode255ID = 255
LSS_BroadcastID = 254

# Read/write status
LSS_CommStatus_Idle = 0
LSS_CommStatus_ReadSuccess = 1
LSS_CommStatus_ReadTimeout = 2
LSS_CommStatus_ReadWrongID = 3
LSS_CommStatus_ReadWrongIdentifier = 4
LSS_CommStatus_ReadWrongFormat = 5
LSS_CommStatus_ReadNoBus = 6
LSS_CommStatus_ReadUnknown = 7
LSS_CommStatus_WriteSuccess = 8
LSS_CommStatus_WriteNoBus = 9
LSS_CommStatus_WriteUnknown = 10

# LSS status
LSS_StatusUnknown = 0
LSS_StatusLimp = 1
LSS_StatusFreeMoving = 2
LSS_StatusAccelerating = 3
LSS_StatusTravelling = 4
LSS_StatusDecelerating = 5
LSS_StatusHolding = 6
LSS_StatusOutsideLimits = 7
LSS_StatusStuck = 8				#cannot move at current speed setting
LSS_StatusBlocked = 9			#same as stuck but reached maximum duty and still can't move
LSS_StatusSafeMode = 10
LSS_StatusLast = 11

# Parameter for query
LSS_QuerySession = 0
LSS_QueryConfig = 1
LSS_QueryInstantaneousSpeed = 2
LSS_QueryTargetTravelSpeed = 3

# Commands - actions
LSS_ActionReset = "RESET"
LSS_ActionLimp = "L"
LSS_ActionHold = "H"
LSS_ActionParameterTime = "T"
LSS_ActionParameterSpeed = "S"
LSS_ActionMoveDeg = "D"
LSS_ActionMovePulse = "P"

# Commands - actions settings
LSS_ActionAngularRange = "AR"

# Commands - queries
LSS_QueryStatus = "Q"
LSS_QueryOriginOffset = "QO"
LSS_QueryAngularRange = "QAR"
LSS_QueryPositionPulse = "QP"
LSS_QueryPositionMV = "QPMV"
LSS_QueryPosition = "QD"
LSS_QueryID = "QID"
LSS_QueryFirmwareVersion = "QF"
LSS_QueryVoltage = "QV"
LSS_QueryCurrent = "QC"


# Commands - configurations


### EOF #######################################################################
