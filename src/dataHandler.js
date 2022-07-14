import { addresses } from './constants'

function offs (va) {
  return va - (va < 0x4E6000 ? 0x400C00 : 0x408600)
}

function parseFlagAssignment (dataView, address) {
  const instructionType = dataView.getUint8(offs(address))
  let value
  if (instructionType === 0xA1) {
    const indirectAddress = dataView.getUint32(offs(address + 1), true)
    value = dataView.getUint32(offs(indirectAddress), true)
  } else if (instructionType === 0xB8) {
    value = dataView.getUint32(offs(address + 1), true)
  } else {
    return null
  }

  return {
    value,
    fileOffset: offs(address + 1),
    patchB8Offset: offs(address)
  }
}

function parseKeyCodeCheck (dataView, address) {
  if (dataView.getUint8(offs(address)) !== 0x6A) {
    return null
  }

  const keyCode = dataView.getInt8(offs(address + 1))
  return {
    keyCode,
    keyCodeFileOffset: offs(address + 1)
  }
}

function parseKeyCodeCheckAndFlagAssignment (dataView, pushAddress, movAddress) {
  const keyCodeCheck = parseKeyCodeCheck(dataView, pushAddress)
  if (!keyCodeCheck) return null
  const flagAssignment = parseFlagAssignment(dataView, movAddress)
  if (!flagAssignment) return null

  return { ...keyCodeCheck, ...flagAssignment }
}

export function parseData (dataView) {
  if (dataView.getUint32(offs(addresses.checkInstruction), true) !== 0xAF23D5F7 || dataView.getUint32(offs(addresses.checkInstruction + 4), true) !== 0x338) {
    return { supported: false }
  }

  const data = {
    supported: true,

    keyAssignments: {},
    joypad: {},
    freestyleAssignments: [],
    joypadPov: null
  }

  const assignmentsByIndex = {}
  const addAssignment = (offset, value, p) => {
    const assignmentIndex = (offset - 0xC) >> 2
    const rmVirtualButtonIndex = assignmentIndex >> 3
    const rmVirtualButton = 1 << rmVirtualButtonIndex

    assignmentsByIndex[assignmentIndex] = {
      assignmentIndex,
      rmVirtualButton,
      value,
      fileOffset: p
    }
  }

  let p = offs(addresses.keyAssignments)
  while (true) {
    const instructionType = dataView.getUint16(p, true)
    p += 2

    let offset
    if (instructionType === 0x43C7) {
      offset = dataView.getInt8(p)
      p += 1
    } else if (instructionType === 0x83C7) {
      offset = dataView.getInt32(p, true)
      p += 4
    } else {
      break
    }

    const value = dataView.getInt32(p, true)
    addAssignment(offset, value, p)

    p += 4
  }

  if (dataView.getUint16(offs(addresses.additionalConfirmMov), true) === 0x80C7) {
    const offset = dataView.getInt32(offs(addresses.additionalConfirmMov + 2), true)
    const value = dataView.getInt32(offs(addresses.additionalConfirmMov + 6), true)
    addAssignment(offset, value, offs(addresses.additionalConfirmMov + 6))
  }

  for (const assignment of Object.values(assignmentsByIndex).sort((a, b) => a.assignmentIndex - b.assignmentIndex)) {
    if (!data.keyAssignments[assignment.rmVirtualButton]) data.keyAssignments[assignment.rmVirtualButton] = []
    data.keyAssignments[assignment.rmVirtualButton].push(assignment)
  }

  data.joypad.left = parseFlagAssignment(dataView, addresses.joypadLeftMov)
  data.joypad.right = parseFlagAssignment(dataView, addresses.joypadRightMov)
  data.joypad.up = parseFlagAssignment(dataView, addresses.joypadUpMov)
  data.joypad.down = parseFlagAssignment(dataView, addresses.joypadDownMov)
  data.joypad.button1 = parseFlagAssignment(dataView, addresses.joypadButton1Mov)
  data.joypad.button2 = parseFlagAssignment(dataView, addresses.joypadButton2Mov)
  data.joypad.button3 = parseFlagAssignment(dataView, addresses.joypadButton3Mov)
  data.joypad.button4 = parseFlagAssignment(dataView, addresses.joypadButton4Mov)
  data.joypad.button5 = parseFlagAssignment(dataView, addresses.joypadButton5Mov)
  data.joypad.button6 = parseFlagAssignment(dataView, addresses.joypadButton6Mov)

  for (const [pushAddress, movAddress] of [
    [addresses.mlPush, addresses.mlMov],
    [addresses.mrPush, addresses.mrMov],
    [addresses.shiftPush, addresses.shiftMov],
    [addresses.ctrlPush, addresses.ctrlMov]
  ]) {
    const keyCodeCheckAndFlagAssignment = parseKeyCodeCheckAndFlagAssignment(dataView, pushAddress, movAddress)
    if (!keyCodeCheckAndFlagAssignment) continue
    data.freestyleAssignments.push(keyCodeCheckAndFlagAssignment)
  }

  if (new TextDecoder('utf-8').decode(new DataView(dataView.buffer, offs(addresses.joyGetPosExStr), 'joyGetPosEx'.length)) === 'joyGetPosEx') {
    data.joypadPov = {
      up: dataView.getUint32(offs(addresses.povUpDd), true),
      right: dataView.getUint32(offs(addresses.povRightDd), true),
      down: dataView.getUint32(offs(addresses.povDownDd), true),
      left: dataView.getUint32(offs(addresses.povLeftDd), true)
    }
    // These are manually set on the right offsets on saving.
  }

  return data
}

export function patchData (dataView, data) {
  if (!data.supported) return

  for (const assignment of Object.values(data.keyAssignments)) {
    for (const { fileOffset, value } of assignment) {
      dataView.setInt32(fileOffset, value, true)
    }
  }

  for (const { patchB8Offset, fileOffset, value } of Object.values(data.joypad)) {
    dataView.setUint8(patchB8Offset, 0xB8)
    dataView.setUint32(fileOffset, value, true)
  }

  for (const { keyCodeFileOffset, keyCode, patchB8Offset, fileOffset, value } of data.freestyleAssignments) {
    dataView.setUint8(keyCodeFileOffset, keyCode)
    dataView.setUint8(patchB8Offset, 0xB8)
    dataView.setUint32(fileOffset, value, true)
  }

  if (data.joypadPov) {
    dataView.setUint32(offs(addresses.povUpDd), data.joypadPov.up, true)
    dataView.setUint32(offs(addresses.povUpRightDd), data.joypadPov.up | data.joypadPov.right, true)
    dataView.setUint32(offs(addresses.povRightDd), data.joypadPov.right, true)
    dataView.setUint32(offs(addresses.povRightDownDd), data.joypadPov.right | data.joypadPov.down, true)
    dataView.setUint32(offs(addresses.povDownDd), data.joypadPov.down, true)
    dataView.setUint32(offs(addresses.povDownLeftDd), data.joypadPov.down | data.joypadPov.left, true)
    dataView.setUint32(offs(addresses.povLeftDd), data.joypadPov.left, true)
    dataView.setUint32(offs(addresses.povLeftUpDd), data.joypadPov.left | data.joypadPov.up, true)
    dataView.setUint32(offs(addresses.povUp2Dd), data.joypadPov.up, true)
  }
}
