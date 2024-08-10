const dockBody = document.querySelector('#dockBody')
const mainTopStartStopCancelFinishButtons = document.querySelector('#mainTopStartStopCancelFinishButtons')
const buttonStart = document.querySelector('#buttonStart')
const buttonStop = document.querySelector('#buttonStop')
const buttonTimeReset = document.querySelector('#buttonTimeReset')
const buttonMReset = document.querySelector('#buttonMReset')
const settingsButtonContainer = document.querySelector('#settingsButtonContainer')
const displayDays = document.querySelector('#days')
const displayHours = document.querySelector('#hours')
const displayMinutes = document.querySelector('#minutes')
const displaySeconds = document.querySelector('#seconds')
const colonDH = document.querySelector('#colonDH')
const colonHM = document.querySelector('#colonHM')
const colonMS = document.querySelector('#colonMS')
const inputDay = document.querySelector('#inputDays')
const inputHour = document.querySelector('#inputHours')
const inputMinute = document.querySelector('#inputMinutes')
const inputSecond = document.querySelector('#inputSeconds')
const buttonOKDays = document.querySelector('#buttonOKDays')
const buttonOKHours = document.querySelector('#buttonOKHours')
const buttonOKMinutes = document.querySelector('#buttonOKMinutes')
const buttonOKSeconds = document.querySelector('#buttonOKSeconds')
const checkboxBeforeTime = document.querySelector('#checkboxBeforeTime')
const checkboxAfterTime = document.querySelector('#checkboxAfterTime')
const checkboxFinishMess = document.querySelector('#checkboxFinishMess')
const inputBeforeTime = document.querySelector('#inputBeforeTime')
const inputAfterTime = document.querySelector('#inputAfterTime')
const inputFinishMess = document.querySelector('#inputFinishMess')
const inputOffNum = document.querySelector('#inputOffNum')
const displayOffOnButton = document.querySelector('#displayOffOnButton')
const checkboxOffSec = document.querySelector('#checkboxOffSec')
const buttonCancelFinish = document.querySelector('#buttonCancelFinish')
const settingsButton = document.querySelector('#settingsButton')
const settingsB = document.querySelector('#settingsB')
const settingsDisplay = document.querySelector('#settingsDisplay')
const url = document.querySelector('#url')
const fName = document.querySelector('#fontName')
const fNameTest = document.querySelector('#fontTest')
const fontTimeSize = document.querySelector('#timeSize')

const browserDisplaySize = document.querySelector('#browserDisplaySize')

const applyFontButton = document.querySelector('#applyFontButton')
const resetFontButton = document.querySelector('#resetFontsSizeButton')
const gradientColor1Input = document.querySelector('#gradientColor1Input')
const gradientColor2Input = document.querySelector('#gradientColor2Input')
const gradientColor3Input = document.querySelector('#gradientColor3Input')
const gradientColor4Input = document.querySelector('#gradientColor4Input')
const gradientColor5Input = document.querySelector('#gradientColor5Input')
const labelColor1 = document.querySelector('#labelColor1')
const labelColor2 = document.querySelector('#labelColor2')
const labelColor3 = document.querySelector('#labelColor3')
const labelColor4 = document.querySelector('#labelColor4')
const labelColor5 = document.querySelector('#labelColor5')
const buttonGradientColorNum = document.querySelector('#buttonGradientColorNum')
const sliderGradientAngle = document.querySelector('#sliderGradientAngle')
const gradientAngleNum = document.querySelector('#gradientAngleNum')
const shadowCheckboxYN = document.querySelector('#shadowCheckboxYN')
const shadowDepthButton = document.querySelector('#shadowDepthButton')
const shadowColorInput = document.querySelector('#shadowColorInput')
const shadowSlideWidth = document.querySelector('#shadowSlideWidth')
const strokeCheckboxYN = document.querySelector('#strokeCheckboxYN')
const strokeColorInput = document.querySelector('#strokeColorInput')
const strokeSlideWidth = document.querySelector('#strokeSlideWidth')

const gradientColor1InputFinish = document.querySelector('#gradientColor1InputFinish')
const gradientColor2InputFinish = document.querySelector('#gradientColor2InputFinish')
const gradientColor3InputFinish = document.querySelector('#gradientColor3InputFinish')
const gradientColor4InputFinish = document.querySelector('#gradientColor4InputFinish')
const gradientColor5InputFinish = document.querySelector('#gradientColor5InputFinish')
const labelColor1Finish = document.querySelector('#labelColor1Finish')
const labelColor2Finish = document.querySelector('#labelColor2Finish')
const labelColor3Finish = document.querySelector('#labelColor3Finish')
const labelColor4Finish = document.querySelector('#labelColor4Finish')
const labelColor5Finish = document.querySelector('#labelColor5Finish')
const buttonGradientColorNumFinish = document.querySelector('#buttonGradientColorNumFinish')
const sliderGradientAngleFinish = document.querySelector('#sliderGradientAngleFinish')
const gradientAngleNumFinish = document.querySelector('#gradientAngleNumFinish')
const shadowCheckboxFinishYN = document.querySelector('#shadowCheckboxFinishYN')
const shadowDepthButtonFinish = document.querySelector('#shadowDepthButtonFinish')
const shadowColorInputFinish = document.querySelector('#shadowColorInputFinish')
const shadowSlideWidthFinish = document.querySelector('#shadowSlideWidthFinish')
const strokeCheckboxFinishYN = document.querySelector('#strokeCheckboxFinishYN')
const strokeColorInputFinish = document.querySelector('#strokeColorInputFinish')
const strokeSlideWidthFinish = document.querySelector('#strokeSlideWidthFinish')

const colorMessFText = document.querySelector('#finishColor')
const finishFontSize = document.querySelector('#finishFontSize')
const finishFontSliderSize = document.querySelector('#finishFontSliderSize')
const checkboxFinish = document.querySelector('#checkboxFinish')

const resetColor = document.querySelector('#resetColor')
const displayMess = document.querySelector('#displayMess')
const buttonUrl = document.querySelector('#buttonUrl')
const buttonFontName = document.querySelector('#buttonFontName')
const mainDisplay = document.querySelector('#mainDisplay')
const settingsButtonDisplay = document.querySelector('#settingsButtonDisplay')
const mainSettingsTopDisplay = document.querySelector('#mainSettingsTopDisplay')
const finishSettingsDisplay = document.querySelector('#finishSettingsDisplay')
const fontSettingsDisplay = document.querySelector('#fontSettingsDisplay')
const displaySettingsDisplay = document.querySelector('#displaySettingsDisplay')
const buttonFontSettings = document.querySelector('#buttonFontSettings')
const buttonColorSettings = document.querySelector('#buttonColorSettings')
const buttonFinishSettings = document.querySelector('#buttonFinishSettings')
const mainTab = document.querySelector('#mainTab')
const lAlign = document.querySelector('#left')
const rAlign = document.querySelector('#right')
const cAlign = document.querySelector('#centre')
const tAlign = document.querySelector('#top')
const bAlign = document.querySelector('#bottom')
const mAlign = document.querySelector('#middle')
const fontArea = document.querySelector('#fontArea')
const currTime = document.querySelector('#currTime')
const currTimeButton = document.querySelector('#currTimeButton')

let minTime = 0,
	hourTime = 0,
	monthDate = 0,
	monthName = '',
	dayName = '',
	dayDate = 0,
	ampm = '',
	daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
	months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
	dateNum = 0,
	endLetters = 0,
	timer,
	tempfile,
	tempfile2,
	secFinish = 0,
	secFinishYN = false,
	messBT = '',
	messBTYN = false,
	messBTcolor = '',
	messAT = '',
	messATYN = false,
	messATcolor = '',
	messF = '',
	messFYN = false,
	messFcolor = '',
	buttonPressed = 'none',
	zeroIsReached = false,
	fontUrl = '',
	fontName = '',
	displaySize = 100,
	ampmStorage = 12,
	shadowWidth = 50,
	strokeColor = '',
	strokeYN = true,
	strokeWidth = 4,
	fontApply = false,
	colorsApply = false,
	year = 0,
	month = 0,
	day = 0,
	hour = 0,
	min = 0,
	sec = 0,
	sec2 = 0,
	timeHS = 3,
	hAlign = '',
	vAlign = '',
	textColor = '',
	shadowYN = false,
	shadowColor = '',
	shadowNum = 1,
	storageInfo,
	browserD,
	alignText,
	display = 'main',
	tag = 'storage:',
	tag2 = 'display:',
	tag3 = 'storage2:',
	tag4 = 'browser2:',
	message,
	settingsChoice = 'font',
	cancelFinish = false,
	finishRun = false,
	displayYN = true,
	graidientInfo = [90, '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', 1],
	deg = graidientInfo[0],
	displayColor1 = graidientInfo[1],
	displayColor2 = graidientInfo[2],
	displayColor3 = graidientInfo[3],
	displayColor4 = graidientInfo[4],
	displayColor5 = graidientInfo[5],
	colorNum = graidientInfo[6],
	fSettingsInfo = [90, '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', 1, false, false, '#000000', 1, 1, false, '#000000', 1, 100],
	fDeg = fSettingsInfo[0],
	fDisplayColor1 = fSettingsInfo[1],
	fDisplayColor2 = fSettingsInfo[2],
	fDisplayColor3 = fSettingsInfo[3],
	fDisplayColor4 = fSettingsInfo[4],
	fDisplayColor5 = fSettingsInfo[5],
	fColorNum = fSettingsInfo[6],
	fPreview = fSettingsInfo[7],
	fShadowYN = fSettingsInfo[8],
	fShadowColor = fSettingsInfo[9],
	fShadowNum = fSettingsInfo[10],
	fShadowWidth = fSettingsInfo[11],
	fStrokeYN = fSettingsInfo[12],
	fStrokeColor = fSettingsInfo[13],
	fStrokeWidth = fSettingsInfo[14],
	fSize = fSettingsInfo[15],
	gradNum,
	gradNumType,
	gColor = '',
	gColor2 = '',
	gColor3 = '',
	gColor4 = '',
	gColor5 = '',
	allClickVar = 1,
	clickTime = '',
	size,
	buttonGNum,
	sizeTimeSlide = 'time',
	sizeFinishSlide = 'finish'
const channel = new BroadcastChannel('obsTimer')
document.addEventListener('click', allClick)
//console.log('first run')
setSettings()
localStorage.removeItem(tag, JSON.stringify(storageInfo))
localStorage.removeItem(tag2, JSON.stringify(browserD))
if (tag3 in localStorage && tag4 in localStorage) updateSettings()
else setSettings()
timeDisplay()
timer = setInterval(timeDisplay, 1000)
checkboxSet()
displayMain()
buttonGradientColorNum.innerHTML = 'Gradient Color Number ' + colorNum
buttonGradientColorNumFinish.innerHTML = 'Gradient Color Number ' + fColorNum
gradientColorNumCheck('time')
gradientColorNumCheck('finish')
//console.log('Startup done')
function drawTime() {
	//console.log('drawTime Function ')
	if (day >= 1) timeHS = 1
	if (day == 0 && hour >= 1) timeHS = 2
	if (day == 0 && hour == 0 && min >= 1) timeHS = 3
	if (day == 0 && hour == 0 && min == 0) timeHS = 4
	if (timeHS == 1) showAllTime()
	if (timeHS == 2) showAllTimeNoDays()
	if (timeHS == 3) showAllTimeNoDaysHours()
	if (timeHS == 4) showAllTimeNoDaysHoursMinutes()
	displayDays.innerHTML = day
	inputDay.value = day
	colonDH.innerHTML = ':'
	displayHours.innerHTML = hour
	inputHour.value = hour
	colonHM.innerHTML = ':'
	displayMinutes.innerHTML = min
	inputMinute.value = min
	colonMS.innerHTML = ':'
	if (sec > 9) displaySeconds.innerHTML = sec
	else displaySeconds.innerHTML = ('0' + sec).slice(-2)
	inputSecond.value = sec
	inputBeforeTime.value = messBT
	inputAfterTime.value = messAT
	inputFinishMess.value = messF
	inputOffNum.value = secFinish
	checkboxBeforeTime.checked = messBTYN
	checkboxAfterTime.checked = messATYN
	checkboxFinishMess.checked = messFYN
	checkboxOffSec.checked = secFinishYN
	fontArea.value = fontUrl
	fName.value = fontName
	browserDisplaySize.value = displaySize
	finishFontSliderSize.value = fSize
	gradientColor1Input.value = displayColor1
	gradientColor2Input.value = displayColor2
	gradientColor3Input.value = displayColor3
	gradientColor4Input.value = displayColor4
	gradientColor5Input.value = displayColor5
	gradientColor1InputFinish.value = fDisplayColor1
	gradientColor2InputFinish.value = fDisplayColor2
	gradientColor3InputFinish.value = fDisplayColor3
	gradientColor4InputFinish.value = fDisplayColor4
	gradientColor5InputFinish.value = fDisplayColor5
	sliderGradientAngle.value = deg
	gradientAngleNum.innerHTML = deg
	sliderGradientAngleFinish.value = fDeg
	gradientAngleNumFinish.innerHTML = fDeg
	shadowCheckboxYN.checked = shadowYN
	shadowCheckboxFinishYN.checked = fShadowYN
	shadowSlideWidth.value = shadowWidth
	shadowSlideWidthFinish.value = fShadowWidth
	shadowColorInput.value = shadowColor
	shadowColorInputFinish.value = fShadowColor
	shadowDepthButton.innerHTML = 'Shadow Depth ' + shadowNum
	shadowDepthButtonFinish.innerHTML = 'Shadow Depth ' + fShadowNum
	strokeCheckboxYN.checked = strokeYN
	strokeCheckboxFinishYN.checked = fStrokeYN
	strokeColorInput.value = strokeColor
	strokeColorInputFinish.value = fStrokeColor
	strokeSlideWidth.value = strokeWidth
	strokeSlideWidthFinish.value = fStrokeWidth
	buttonGradientColorNum.innerHTML = 'Gradient Color Number ' + colorNum
	buttonGradientColorNumFinish.innerHTML = 'Gradient Color Number ' + fColorNum
	gradientColorNumCheck('time')
	gradientColorNumCheck('finish')
	buttonCancelFinish.style.color = 'rgba(255, 255, 255, 0.2)'
	if (finishRun) {
		showAllTimeNoDaysHoursMinutes()
		displaySeconds.innerHTML = 'Finished State'
		displaySeconds.style.fontSize = '30px'
		displaySeconds.style.paddingTop = '5px'
		displaySeconds.style.height = '41px'
		buttonCancelFinish.style.color = 'white'
		buttonStart.style.color = 'rgba(255, 255, 255, 0.2)'
		buttonStop.style.color = 'rgba(255, 255, 255, 0.2)'
	}
	graidientInfo = [deg, displayColor1, displayColor2, displayColor3, displayColor4, displayColor5, colorNum]
	fSettingsInfo = [fDeg, fDisplayColor1, fDisplayColor2, fDisplayColor3, fDisplayColor4, fDisplayColor5, fColorNum, fPreview, fShadowYN, fShadowColor, fShadowNum, fShadowWidth, fStrokeYN, fStrokeColor, fStrokeWidth, fSize]
	storageInfo = [fontUrl, fontName, displaySize, graidientInfo, hAlign, vAlign, shadowColor, shadowYN, shadowNum, messBTcolor, messATcolor, messFcolor, ampmStorage, fSettingsInfo, shadowWidth, strokeColor, strokeYN, strokeWidth, settingsChoice, cancelFinish]
	browserD = [zeroIsReached, secFinish, year, month, day, hour, min, sec, timeHS, messBT, messBTYN, messAT, messATYN, messF, messFYN, secFinishYN, displayYN]
	localStorage.setItem(tag3, JSON.stringify(storageInfo))
	localStorage.setItem(tag4, JSON.stringify(browserD))
	tempfile = JSON.parse(window.localStorage.getItem(tag3))
	tempfile2 = JSON.parse(window.localStorage.getItem(tag4))
	message = [tempfile, tempfile2]
	channel.postMessage(message)
	//console.log('Message sent')
	//console.log(storageInfo)
	//console.log(browserD)
	//console.log(graidientInfo)
	//console.log(fSettingsInfo)
}
function aClick() {
	//console.log(aClick)
	dockBody.removeEventListener('click', drawTime)
}
function setSettings() {
	//console.log('setSettings Function')
	fontUrl = 'https://fonts.googleapis.com/css2?family=Poetsen+One&display=swap'
	fontName = 'Poetsen One, sans-serif'
	displaySize = 100
	graidientInfo = [90, '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', 1]
	fSettingsInfo = [90, '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', 1, false, false, '#000000', 1, 1, false, '#000000', 1, 100]
	deg = graidientInfo[0]
	displayColor1 = graidientInfo[1]
	displayColor2 = graidientInfo[2]
	displayColor3 = graidientInfo[3]
	displayColor4 = graidientInfo[4]
	displayColor5 = graidientInfo[5]
	colorNum = graidientInfo[6]
	fDeg = fSettingsInfo[0]
	fDisplayColor1 = fSettingsInfo[1]
	fDisplayColor2 = fSettingsInfo[2]
	fDisplayColor3 = fSettingsInfo[3]
	fDisplayColor4 = fSettingsInfo[4]
	fDisplayColor5 = fSettingsInfo[5]
	fColorNum = fSettingsInfo[6]
	fPreview = fSettingsInfo[7]
	fShadowYN = fSettingsInfo[8]
	fShadowColor = fSettingsInfo[9]
	fShadowNum = fSettingsInfo[10]
	fShadowWidth = fSettingsInfo[11]
	fStrokeYN = fSettingsInfo[12]
	fStrokeColor = fSettingsInfo[13]
	fStrokeWidth = fSettingsInfo[14]
	fSize = fSettingsInfo[15]
	hAlign = 'left'
	vAlign = 'flex-start'
	shadowColor = '#000000'
	shadowYN = false
	shadowNum = 1
	messBTcolor = '#ffffff'
	messATcolor = '#ffffff'
	messFcolor = '#ffffff'
	ampmStorage = 12
	fPreview = false
	shadowWidth = 10
	strokeColor = '#000000'
	strokeYN = true
	strokeWidth = 1
	settingsChoice = 'font'
	cancelFinish = false
	zeroIsReached = false
	secFinish = 0
	year = 0
	month = 0
	day = 0
	hour = 0
	min = 0
	sec = 0
	timeHS = 3
	messBT = ''
	messBTYN = false
	messAT = ''
	messATYN = false
	messF = ''
	messFYN = false
	secFinishYN = false
	displayYN = true
	storageInfo = [fontUrl, fontName, displaySize, graidientInfo, hAlign, vAlign, shadowColor, shadowYN, shadowNum, messBTcolor, messATcolor, messFcolor, ampmStorage, fSettingsInfo, shadowWidth, strokeColor, strokeYN, strokeWidth, settingsChoice, cancelFinish]
	browserD = [zeroIsReached, secFinish, year, month, day, hour, min, sec, timeHS, messBT, messBTYN, messAT, messATYN, messF, messFYN, secFinishYN, displayYN]
}
function updateSettings() {
	//console.log('updateSettings Function')

	storageInfo = JSON.parse(window.localStorage.getItem(tag3))
	browserD = JSON.parse(window.localStorage.getItem(tag4))

	fontUrl = storageInfo[0]
	fontName = storageInfo[1]
	displaySize = storageInfo[2]
	graidientInfo = storageInfo[3]
	hAlign = storageInfo[4]
	vAlign = storageInfo[5]
	shadowColor = storageInfo[6]
	shadowYN = storageInfo[7]
	shadowNum = storageInfo[8]
	messATcolor = storageInfo[10]
	messFcolor = storageInfo[11]
	ampmStorage = storageInfo[12]
	fSettingsInfo = storageInfo[13]
	shadowWidth = storageInfo[14]
	strokeColor = storageInfo[15]
	strokeYN = storageInfo[16]
	strokeWidth = storageInfo[17]
	settingsChoice = storageInfo[18]
	cancelFinish = storageInfo[19]
	zeroIsReached = false
	secFinish = browserD[1]
	year = browserD[2]
	month = browserD[3]
	day = browserD[4]
	hour = browserD[5]
	min = browserD[6]
	sec = browserD[7]
	timeHS = browserD[8]
	messBT = browserD[9]
	messBTYN = browserD[10]
	messAT = browserD[11]
	messATYN = browserD[12]
	messF = browserD[13]
	messFYN = browserD[14]
	secFinishYN = browserD[15]
	displayYN = true
	deg = graidientInfo[0]
	displayColor1 = graidientInfo[1]
	displayColor2 = graidientInfo[2]
	displayColor3 = graidientInfo[3]
	displayColor4 = graidientInfo[4]
	displayColor5 = graidientInfo[5]
	colorNum = graidientInfo[6]
	fDeg = fSettingsInfo[0]
	fDisplayColor1 = fSettingsInfo[1]
	fDisplayColor2 = fSettingsInfo[2]
	fDisplayColor3 = fSettingsInfo[3]
	fDisplayColor4 = fSettingsInfo[4]
	fDisplayColor5 = fSettingsInfo[5]
	fColorNum = fSettingsInfo[6]
	fPreview = fSettingsInfo[7]
	fShadowYN = fSettingsInfo[8]
	fShadowColor = fSettingsInfo[9]
	fShadowNum = fSettingsInfo[10]
	fShadowWidth = fSettingsInfo[11]
	fStrokeYN = fSettingsInfo[12]
	fStrokeColor = fSettingsInfo[13]
	fStrokeWidth = fSettingsInfo[14]
	fSize = fSettingsInfo[15]
	storageInfo = [fontUrl, fontName, displaySize, graidientInfo, hAlign, vAlign, shadowColor, shadowYN, shadowNum, messBTcolor, messATcolor, messFcolor, ampmStorage, fSettingsInfo, shadowWidth, strokeColor, strokeYN, strokeWidth, settingsChoice, cancelFinish]
	browserD = [zeroIsReached, secFinish, year, month, day, hour, min, sec, timeHS, messBT, messBTYN, messAT, messATYN, messF, messFYN, secFinishYN, displayYN]
	//console.log(storageInfo)
	//console.log(browserD)
	//console.log(graidientInfo)
	//console.log(fSettingsInfo)
}
function timeDisplay() {
	if (ampmStorage != 12 && ampmStorage != 24) {
		ampmStorage = 12
		drawTime()
	}
	if (ampmStorage == 12) {
		currTimeButton.buttonPressed = true
		currTimeButton.innerHTML = '12hr'
	} else {
		currTimeButton.buttonPressed = false
		currTimeButton.innerHTML = '24hr'
	}
	const dateAndTime = new Date()
	yearTime = dateAndTime.getFullYear()
	minTime = dateAndTime.getMinutes()
	hourTime = dateAndTime.getHours()
	dayName = daysOfWeek[dateAndTime.getDay()]
	monthName = months[dateAndTime.getMonth()]
	dateNum = dateAndTime.getDate()
	if (dateNum == 1) endLetters = 'st'
	if (dateNum == 2) endLetters = 'nd'
	if (dateNum == 3) endLetters = 'rd'
	if (dateNum > 3) endLetters = 'th'
	if (minTime < 10) minTime = ('0' + minTime).slice(-2)
	if (currTimeButton.buttonPressed) {
		if (hourTime == 0) hourTime = 12
		if (hourTime > 12) {
			hourTime = hourTime - 12
			ampm = 'PM'
		} else {
			ampm = 'AM'
		}
	} else {
		if (hourTime < 10) hourTime = ('0' + hourTime).slice(-2)
		ampm = ''
	}
	if (ampm == 'AM' && hourTime == 12) ampm = 'PM'

	currTime.innerHTML = monthName + ' ' + dateNum + endLetters + ' ' + dayName + ' ' + hourTime + ':' + minTime + ampm
}
function currTimeButton24hr() {
	if (startButton.buttonPressed || finishRun || !displayYN) return
	if (currTimeButton.buttonPressed) {
		currTimeButton.buttonPressed = false
		currTimeButton.innerHTML = '24hr'
		ampmStorage = 24
	} else {
		currTimeButton.buttonPressed = true
		currTimeButton.innerHTML = '12hr'
		ampmStorage = 12
	}
	drawTime()
}
function gradientColorNumCheck(gradNumSet) {
	if (gradNumSet == 'time') gradNum = colorNum
	if (gradNumSet == 'finish') gradNum = fColorNum
	if (gradNum == 1) {
		gColor2 = 'rgba(255, 255, 255, 0.2)'
		gColor3 = 'rgba(255, 255, 255, 0.2)'
		gColor4 = 'rgba(255, 255, 255, 0.2)'
		gColor5 = 'rgba(255, 255, 255, 0.2)'
	}
	if (gradNum == 2) {
		gColor2 = 'rgb(255, 255, 255)'
		gColor3 = 'rgba(255, 255, 255, 0.2)'
		gColor4 = 'rgba(255, 255, 255, 0.2)'
		gColor5 = 'rgba(255, 255, 255, 0.2)'
	}
	if (gradNum == 3) {
		gColor2 = 'rgb(255, 255, 255)'
		gColor3 = 'rgb(255, 255, 255)'
		gColor4 = 'rgba(255, 255, 255, 0.2)'
		gColor5 = 'rgba(255, 255, 255, 0.2)'
	}
	if (gradNum == 4) {
		gColor2 = 'rgb(255, 255, 255)'
		gColor3 = 'rgb(255, 255, 255)'
		gColor4 = 'rgb(255, 255, 255)'
		gColor5 = 'rgba(255, 255, 255, 0.2)'
	}
	if (gradNum == 5) {
		gColor2 = 'rgb(255, 255, 255)'
		gColor3 = 'rgb(255, 255, 255)'
		gColor4 = 'rgb(255, 255, 255)'
		gColor5 = 'rgb(255, 255, 255)'
	}
	if (gradNumSet == 'time') {
		labelColor2.style.color = gColor2
		labelColor3.style.color = gColor3
		labelColor4.style.color = gColor4
		labelColor5.style.color = gColor5
	}
	if (gradNumSet == 'finish') {
		labelColor2Finish.style.color = gColor2
		labelColor3Finish.style.color = gColor3
		labelColor4Finish.style.color = gColor4
		labelColor5Finish.style.color = gColor5
	}
}
function gradientColorNum(buttonGNumber) {
	//console.log('gradientColorNum')
	//console.log(buttonGNumber)

	if (buttonGNumber == 'time') gColor = colorNum
	if (buttonGNumber == 'finish') gColor = fColorNum
	//console.log(gColor)
	if (gColor == 1) {
		gColor = 2
		gColor2 = 'rgb(255, 255, 255)'
		gColor3 = 'rgba(255, 255, 255, 0.2)'
		gColor4 = 'rgba(255, 255, 255, 0.2)'
		gColor5 = 'rgba(255, 255, 255, 0.2)'
		displayGradientColorNum(buttonGNumber)
		return
	}
	if (gColor == 2) {
		gColor = 3
		gColor2 = 'rgb(255, 255, 255)'
		gColor3 = 'rgb(255, 255, 255)'
		gColor4 = 'rgba(255, 255, 255, 0.2)'
		gColor5 = 'rgba(255, 255, 255, 0.2)'
		displayGradientColorNum(buttonGNumber)
		return
	}
	if (gColor == 3) {
		gColor = 4
		gColor2 = 'rgb(255, 255, 255)'
		gColor3 = 'rgb(255, 255, 255)'
		gColor4 = 'rgb(255, 255, 255)'
		gColor5 = 'rgba(255, 255, 255, 0.2)'
		displayGradientColorNum(buttonGNumber)
		return
	}
	if (gColor == 4) {
		gColor = 5
		gColor2 = 'rgb(255, 255, 255)'
		gColor3 = 'rgb(255, 255, 255)'
		gColor4 = 'rgb(255, 255, 255)'
		gColor5 = 'rgb(255, 255, 255)'
		displayGradientColorNum(buttonGNumber)
		return
	}
	if (gColor == 5) {
		gColor = 1
		gColor2 = 'rgba(255, 255, 255, 0.2)'
		gColor3 = 'rgba(255, 255, 255, 0.2)'
		gColor4 = 'rgba(255, 255, 255, 0.2)'
		gColor5 = 'rgba(255, 255, 255, 0.2)'
		displayGradientColorNum(buttonGNumber)
		return
	}
	function displayGradientColorNum(buttonGNumber) {
		//console.log('displayGradientColorNum')
		//console.log(buttonGNumber)
		//console.log(gColor)
		if (buttonGNumber == 'time') {
			buttonGradientColorNum.innerHTML = 'Gradient Color Number ' + gColor
			labelColor2.style.color = gColor2
			labelColor3.style.color = gColor3
			labelColor4.style.color = gColor4
			labelColor5.style.color = gColor5
		}
		if (buttonGNumber == 'finish') {
			buttonGradientColorNumFinish.innerHTML = 'Gradient Color Number ' + gColor
			labelColor2Finish.style.color = gColor2
			labelColor3Finish.style.color = gColor3
			labelColor4Finish.style.color = gColor4
			labelColor5Finish.style.color = gColor5
		}
		if (buttonGNumber == 'time') colorNum = gColor
		if (buttonGNumber == 'finish') fColorNum = gColor
		drawTime()
	}
}
function gradientColor1InputF(type) {
	if (type == 'time') displayColor1 = gradientColor1Input.value
	if (type == 'finish') fDisplayColor1 = gradientColor1InputFinish.value
	drawTime()
}
function gradientColor2InputF(type) {
	if (type == 'time') displayColor2 = gradientColor2Input.value
	if (type == 'finish') fDisplayColor2 = gradientColor2InputFinish.value
	drawTime()
}
function gradientColor3InputF(type) {
	if (type == 'time') displayColor3 = gradientColor3Input.value
	if (type == 'finish') fDisplayColor3 = gradientColor3InputFinish.value
	drawTime()
}
function gradientColor4InputF(type) {
	if (type == 'time') displayColor4 = gradientColor4Input.value
	if (type == 'finish') fDisplayColor4 = gradientColor4InputFinish.value
	drawTime()
}
function gradientColor5InputF(type) {
	if (type == 'time') displayColor5 = gradientColor5Input.value
	if (type == 'finish') fDisplayColor5 = gradientColor5InputFinish.value
	drawTime()
}
function sliderInputGradientAngle(type) {
	if (type == 'time') deg = sliderGradientAngle.value
	if (type == 'finish') fDeg = sliderGradientAngleFinish.value
	drawTime()
}
function colorShadowYN(type) {
	if (type == 'time') {
		if (shadowCheckboxYN.checked) {
			shadowYN = true
			strokeYN = false
		} else shadowYN = false
	}
	if (type == 'finish') {
		if (shadowCheckboxFinishYN.checked) {
			fShadowYN = true
			fStrokeYN = false
		} else fShadowYN = false
	}
	drawTime()
}
function colorShadow(type) {
	if (type == 'time') shadowColor = shadowColorInput.value
	if (type == 'finish') fShadowColor = shadowColorInputFinish.value
	drawTime()
}
function shadowSliderWidthSize(type) {
	if (type == 'time') shadowWidth = shadowSlideWidth.value
	if (type == 'finish') fShadowWidth = shadowSlideWidthFinish.value
	drawTime()
}
function shadowDepthFunction(type) {
	//console.log(type)
	if (type == 'time') {
		shadowNum = shadowNum
		if (strokeYN) return
	}
	if (type == 'finish') {
		shadowNum = fShadowNum
		if (fStrokeYN) return
	}
	console.log(shadowNum)
	if (shadowNum == 1) {
		shadowNum = 2
		if (type == 'finish') {
			shadowNum = 1
			fShadowNum = 2
		}
		drawTime()
		return
	}
	if (shadowNum == 2) {
		shadowNum = 3
		if (type == 'finish') {
			shadowNum = 2
			fShadowNum = 3
		}
		drawTime()
		return
	}
	if (shadowNum == 3) {
		shadowNum = 4
		if (type == 'finish') {
			shadowNum = 3
			fShadowNum = 4
		}
		drawTime()
		return
	}
	if (shadowNum == 4) {
		shadowNum = 5
		if (type == 'finish') {
			shadowNum = 4
			fShadowNum = 5
		}
		drawTime()
		return
	}
	if (shadowNum == 5) {
		shadowNum = 6
		if (type == 'finish') {
			shadowNum = 5
			fShadowNum = 6
		}
		drawTime()
		return
	}
	if (shadowNum == 6) {
		shadowNum = 7
		if (type == 'finish') {
			shadowNum = 6
			fShadowNum = 7
		}
		drawTime()
		return
	}
	if (shadowNum == 7) {
		shadowNum = 8
		if (type == 'finish') {
			shadowNum = 7
			fShadowNum = 8
		}
		drawTime()
		return
	}
	if (shadowNum == 8) {
		shadowNum = 9
		if (type == 'finish') {
			shadowNum = 8
			fShadowNum = 9
		}
		drawTime()
		return
	}
	if (shadowNum == 9) {
		shadowNum = 10
		if (type == 'finish') {
			shadowNum = 9
			fShadowNum = 10
		}
		drawTime()
		return
	}
	if (shadowNum == 10) {
		shadowNum = 1
		if (type == 'finish') {
			shadowNum = 10
			fShadowNum = 1
		}
		drawTime()
		return
	}
}
function colorStrokeYN(type) {
	if (type == 'time') {
		if (strokeCheckboxYN.checked) {
			strokeYN = true
			shadowYN = false
		} else strokeYN = false
	}
	if (type == 'finish') {
		if (strokeCheckboxFinishYN.checked) {
			fStrokeYN = true
			fShadowYN = false
		} else fStrokeYN = false
	}
	drawTime()
}
function strokeColorInputFunction(type) {
	if (type == 'time') strokeColor = strokeColorInput.value
	if (type == 'finish') fStrokeColor = strokeColorInputFinish.value
	drawTime()
}
function strokeSliderWidthSize(type) {
	if (type == 'time') strokeWidth = strokeSlideWidth.value
	if (type == 'finish') fStrokeWidth = strokeSlideWidthFinish.value
	drawTime()
}
function resetDisplay(type) {
	if (type == 'time') {
		displaySize = 100
		deg = 90
		displayColor1 = '#000000'
		displayColor2 = '#ffffff'
		displayColor3 = '#000000'
		displayColor4 = '#ffffff'
		displayColor5 = '#000000'
		colorNum = 1
		shadowColor = '#000000'
		strokeColor = '#000000'
		strokeYN = true
		strokeWidth = 2
		shadowYN = false
		shadowWidth = 10
		shadowNum = 1
		drawTime()
	}
	if (type == 'finish') {
		fSize = 100
		fDeg = 90
		fDisplayColor1 = '#000000'
		fDisplayColor2 = '#ffffff'
		fDisplayColor3 = '#000000'
		fDisplayColor4 = '#ffffff'
		fDisplayColor5 = '#000000'
		fColorNum = 1
		fShadowColor = '#000000'
		fStrokeColor = '#000000'
		fStrokeYN = true
		fStrokeWidth = 2
		fShadowYN = false
		fShadowWidth = 10
		fShadowNum = 1
		drawTime()
	}
}
function sliderBrowserDisplaySize(size) {
	//console.log('sliderBrowserDisplaySize Function')
	//console.log(size)
	if (size == 'time') displaySize = browserDisplaySize.value
	if (size == 'finish') fSize = finishFontSliderSize.value
	drawTime()
}

function finishMessageYN() {
	if (checkboxFinish.checked) fPreview = true
	else fPreview = false
	drawTime()
}
function checkboxSet() {
	if (messBTYN) checkboxBeforeTime.checked = true
	else checkboxBeforeTime.checked = false
	if (messATYN) checkboxAfterTime.checked = true
	else checkboxAfterTime.checked = false
	if (messFYN) checkboxFinishMess.checked = true
	else checkboxFinishMess.checked = false
	if (secFinishYN) checkboxOffSec.checked = true
	else checkboxOffSec.checked = false
	if (fPreview) checkboxFinish.checked = true
	else checkboxFinish.checked = false
}
function fontTextArea() {
	fontArea.value = ''
}
function fontNameBox() {
	fName.value = ''
}
function applyFontUrl() {
	fontUrl = fontArea.value
	fontName = fName.value
	drawTime()
}
function resetFontUrl() {
	fontUrl = 'https://fonts.googleapis.com/css2?family=Poetsen+One&display=swap'
	fontName = 'Poetsen One, sans-serif'
	storageInfo[0] = fontUrl
	storageInfo[1] = fontName
	fontArea.value = fontUrl
	fName.value = fontName
	drawTime()
}

function showAllTime() {
	timeHS = 1
	displayDays.style.display = 'block'
	colonDH.style.display = 'block'
	displayHours.style.display = 'block'
	colonHM.style.display = 'block'
	displayMinutes.style.display = 'block'
	colonMS.style.display = 'block'
	displaySeconds.style.display = 'block'
}
function showAllTimeNoDays() {
	timeHS = 2
	displayDays.style.display = 'none'
	colonDH.style.display = 'none'
	displayHours.style.display = 'block'
	colonHM.style.display = 'block'
	displayMinutes.style.display = 'block'
	colonMS.style.display = 'block'
	displaySeconds.style.display = 'block'
}
function showAllTimeNoDaysHours() {
	timeHS = 3
	displayDays.style.display = 'none'
	colonDH.style.display = 'none'
	displayHours.style.display = 'none'
	colonHM.style.display = 'none'
	displayMinutes.style.display = 'block'
	colonMS.style.display = 'block'
	displaySeconds.style.display = 'block'
}
function showAllTimeNoDaysHoursMinutes() {
	timeHS = 4
	displayDays.style.display = 'none'
	colonDH.style.display = 'none'
	displayHours.style.display = 'none'
	colonHM.style.display = 'none'
	displayMinutes.style.display = 'none'
	colonMS.style.display = 'none'
	displaySeconds.style.display = 'block'
}
function allClick() {
	if (allClickVar == 1) {
		allClickVar = 2
		return
	}
	if (clickTime == 'day') dayOutClick()
	if (clickTime == 'hour') hourOutClick()
	if (clickTime == 'min') minOutClick()
	if (clickTime == 'sec') secOutClick()
	if (clickTime == 'offSec') offSecOutClick()
}
function dayOutClick() {
	if (allClickVar == 2 && inputDay.addEventListener('click', clickBox)) return
	else {
		allClickVar = 1
		clickTime = ''
		inputDay.value = day
		inputDay.removeEventListener('click', clickBox)
	}
}
function hourOutClick() {
	if (allClickVar == 2 && inputHour.addEventListener('click', clickBox)) return
	else {
		allClickVar = 1
		clickTime = ''
		inputHour.value = hour
		inputHour.removeEventListener('click', clickBox)
	}
}
function minOutClick() {
	if (allClickVar == 2 && inputMinute.addEventListener('click', clickBox)) return
	else {
		allClickVar = 1
		clickTime = ''
		inputMinute.value = min
		inputMinute.removeEventListener('click', clickBox)
	}
}
function secOutClick() {
	if (allClickVar == 2 && inputSecond.addEventListener('click', clickBox)) return
	else {
		allClickVar = 1
		clickTime = ''
		inputSecond.value = sec
		inputSecond.removeEventListener('click', clickBox)
	}
}
function offSecOutClick() {
	if (allClickVar == 2 && inputOffNum.addEventListener('click', clickBox)) return
	else allClickVar = 1
	clickTime = ''
	inputOffNum.value = secFinish
	inputOffNum.removeEventListener('click', clickBox)
}
function clickBox() {
	return
}
function inputDaysChange() {
	if (startButton.buttonPressed || finishRun || !displayYN) return
	//console.log('inputDaysChange')
	if (inputDay.value <= -1) {
		day = 0
		drawTime()
		return
	}
	if (inputDay.value >= 1000) {
		day = 0
		drawTime()
		return
	}
	day = inputDay.value
	day = parseInt(day)
	setTimeHS()
	drawTime()
}

function inputDaysNum() {
	if (startButton.buttonPressed || finishRun || !displayYN) {
		inputDay.value = day
		return
	}
	//console.log('inputDaysNum')
	drawTime()
	inputDay.value = ''
	allClickVar = 1
	clickTime = 'day'
}
function inputHoursChange() {
	if (startButton.buttonPressed || finishRun || !displayYN) return
	if (inputHour.value <= 0) {
		hour = 0
		drawTime()
		return
	}
	if (inputHour.value >= 23) {
		hour = 0
		drawTime()
		return
	}
	hour = inputHour.value
	hour = parseInt(hour)
	setTimeHS()
	drawTime()
}
function inputHoursNum() {
	if (startButton.buttonPressed || finishRun || !displayYN) {
		inputHour.value = hour
		return
	}
	drawTime()
	inputHour.value = ''
	allClickVar = 1
	clickTime = 'hour'
}
function inputMinutesChange() {
	if (startButton.buttonPressed || finishRun || !displayYN) return
	if (inputMinute.value <= 0) {
		min = 0
		drawTime()
		return
	}
	if (inputMinute.value >= 59) {
		min = 0
		drawTime()
		return
	}
	min = inputMinute.value
	min = parseInt(min)
	setTimeHS()
	drawTime()
}
function inputMinutesNum() {
	if (startButton.buttonPressed || finishRun || !displayYN) {
		inputMinute.value = min
		return
	}
	drawTime()
	inputMinute.value = ''
	allClickVar = 1
	clickTime = 'min'
}
function setTimeHS() {
	if (day >= 1) timeHS = 1
	if (day == 0 && hour >= 1) timeHS = 2
	if (day == 0 && hour == 0 && min >= 1) timeHS = 3
	if (day == 0 && hour == 0 && min == 0) timeHS = 4
}
function inputSecondsChange() {
	if (startButton.buttonPressed || finishRun || !displayYN) return
	if (inputSecond.value <= 0) {
		sec = 0
		drawTime()
		return
	}
	if (inputSecond.value >= 59) {
		sec = 0
		drawTime()
		return
	}
	sec = inputSecond.value
	sec = parseInt(sec)
	drawTime()
}
function inputSecondsNum() {
	if (startButton.buttonPressed || finishRun || !displayYN) {
		inputSecond.value = sec
		return
	}
	drawTime()
	inputSecond.value = ''
	allClickVar = 1
	clickTime = 'sec'
}
function messBeforeInputChange() {
	if (startButton.buttonPressed || finishRun || !displayYN) return
	messBT = inputBeforeTime.value
	//messBT = messBT + ' '

	drawTime()
}
function messBeforeCheckbox() {
	if (startButton.buttonPressed || finishRun || !displayYN) {
		if (checkboxBeforeTime.checked) checkboxBeforeTime.checked = false
		else checkboxBeforeTime.checked = true
		return
	}
	if (checkboxBeforeTime.checked == true) messBTYN = true
	else messBTYN = false
	drawTime()
}
function messBeforeInput() {
	if (startButton.buttonPressed || finishRun || !displayYN) {
		inputBeforeTime.value = messBT
		return
	}
	inputBeforeTime.value = ''
	messBT = ''
	drawTime()
}
function messAfterInputChange() {
	if (startButton.buttonPressed || finishRun || !displayYN) return
	messAT = inputAfterTime.value
	drawTime()
}
function messAfterCheckbox() {
	if (startButton.buttonPressed || finishRun || !displayYN) {
		if (checkboxAfterTime.checked) checkboxAfterTime.checked = false
		else checkboxAfterTime.checked = true
		return
	}
	if (checkboxAfterTime.checked) messATYN = true
	else messATYN = false
	drawTime()
}
function messAfterInput() {
	if (startButton.buttonPressed || finishRun || !displayYN) {
		inputAfterTime.value = messAT
		return
	}
	inputAfterTime.value = ''
	messAT = ''
	drawTime()
}
function messFinishInputChange() {
	if (startButton.buttonPressed || finishRun || !displayYN) return
	messF = inputFinishMess.value
	drawTime()
}
function messFinishCheckbox() {
	if (startButton.buttonPressed || finishRun || !displayYN) {
		if (checkboxFinishMess.checked) checkboxFinishMess.checked = false
		else checkboxFinishMess.checked = true
		return
	}
	if (checkboxFinishMess.checked) messFYN = true
	else messFYN = false
	drawTime()
}
function messFinishInput() {
	if (startButton.buttonPressed || finishRun || !displayYN) {
		inputFinishMess.value = messF
		return
	}
	inputFinishMess.value = ''
	messF = ''
	drawTime()
}
function messOffSecInputChange() {
	if (startButton.buttonPressed || finishRun || !displayYN) return
	if (inputOffNum.value <= -1 || inputOffNum.value >= 901) {
		inputOffNum.value = secFinish
		return
	}
	secFinish = inputOffNum.value
	drawTime()
}
function offSecCheckbox() {
	if (startButton.buttonPressed || finishRun || !displayYN) {
		if (checkboxOffSec.checked) checkboxOffSec.checked = false
		else checkboxOffSec.checked = true
		return
	}
	if (checkboxOffSec.checked) secFinishYN = true
	else secFinishYN = false
	drawTime()
}
function messOffSec() {
	if (startButton.buttonPressed || finishRun || !displayYN) {
		inputOffNum.value = secFinish
		return
	}
	drawTime()
	inputOffNum.value = ''
	allClickVar = 1
	clickTime = 'offSec'
}

function hAlignButton(pos) {
	if (pos == 1) {
		if (hAlign == 'left') return
		lAlign.src = alignText[2]
		cAlign.src = alignText[3]
		rAlign.src = alignText[5]
		hAlign = 'left'
		drawTime()
	}
	if (pos == 2) {
		if (hAlign == 'center') return
		lAlign.src = alignText[1]
		cAlign.src = alignText[4]
		rAlign.src = alignText[5]
		hAlign = 'center'
		drawTime()
	}
	if (pos == 3) {
		if (hAlign == 'right') return
		lAlign.src = alignText[1]
		cAlign.src = alignText[3]
		rAlign.src = alignText[6]
		hAlign = 'right'
		drawTime()
	}
}
function vAlignButton(pos) {
	if (pos == 1) {
		if (vAlign == 'flex-start') return
		tAlign.src = alignText[8]
		mAlign.src = alignText[9]
		bAlign.src = alignText[11]
		vAlign = 'flex-start'
		drawTime()
	}
	if (pos == 2) {
		if (vAlign == 'center') return
		tAlign.src = alignText[7]
		mAlign.src = alignText[10]
		bAlign.src = alignText[11]
		vAlign = 'center'
		drawTime()
	}
	if (pos == 3) {
		if (vAlign == 'flex-end') return
		tAlign.src = alignText[7]
		mAlign.src = alignText[9]
		bAlign.src = alignText[12]
		vAlign = 'flex-end'
		drawTime()
	}
}
function setAlignIcon() {
	if (hAlign == 'left') {
		lAlign.src = alignText[2]
		cAlign.src = alignText[3]
		rAlign.src = alignText[5]
	}
	if (hAlign == 'center') {
		lAlign.src = alignText[1]
		cAlign.src = alignText[4]
		rAlign.src = alignText[5]
	}
	if (hAlign == 'right') {
		lAlign.src = alignText[1]
		cAlign.src = alignText[3]
		rAlign.src = alignText[6]
	}
	if (vAlign == 'flex-start') {
		tAlign.src = alignText[8]
		mAlign.src = alignText[9]
		bAlign.src = alignText[11]
	}
	if (vAlign == 'center') {
		tAlign.src = alignText[7]
		mAlign.src = alignText[10]
		bAlign.src = alignText[11]
	}
	if (vAlign == 'flex-end') {
		tAlign.src = alignText[7]
		mAlign.src = alignText[9]
		bAlign.src = alignText[12]
	}
}
function setAlignPics() {
	alignText = ['', 'Images/leftGrey.png', 'Images/leftWhite.png', 'Images/centreGrey.png', 'Images/centreWhite.png', 'Images/rightGrey.png', 'Images/rightWhite.png', 'Images/topGrey.png', 'Images/topWhite.png', 'Images/middleGrey.png', 'Images/middleWhite.png', 'Images/bottomGrey.png', 'Images/bottomWhite.png']
}
function settings() {
	if (buttonStart.buttonPressed || finishRun || !displayYN) return
	if (display == 'main') {
		if (settingsChoice == 'font') displayFontSettings()
		if (settingsChoice == 'display') displayDisplaySettings()
		if (settingsChoice == 'finish') displayFinishSettings()
	} else displayMain()
	drawTime()
}
function displayOffOnFunction() {
	if (buttonStart.buttonPressed || finishRun) return
	if (displayYN) {
		displayYN = false
		displayOffOnButton.innerHTML = 'DISPLAY OFF'
		displayOffOnButton.style.color = 'red'
		buttonStart.style.color = 'rgba(255, 255, 255, 0.2)'
		buttonStop.style.color = 'rgba(255, 255, 255, 0.2)'
		buttonTimeReset.style.color = 'rgba(255, 255, 255, 0.2)'
		buttonMReset.style.color = 'rgba(255, 255, 255, 0.2)'
		settingsButton.style.color = 'rgba(255, 255, 255, 0.2)'
		currTimeButton.style.color = 'rgba(255, 255, 255, 0.2)'
	} else {
		displayYN = true
		displayOffOnButton.innerHTML = 'DISPLAY ON'
		displayOffOnButton.style.color = 'white'
		buttonStart.style.color = 'white'
		buttonStop.style.color = 'white'
		buttonTimeReset.style.color = 'white'
		buttonMReset.style.color = 'white'
		settingsButton.style.color = 'white'
		currTimeButton.style.color = 'white'
	}
	drawTime()
}
function cancelFinishButton() {
	if (startButton.buttonPressed || !displayYN) return
	if (finishRun) {
		buttonCancelFinish.buttonPressed = true
		buttonStart.buttonPressed = false
		displaySeconds.style.fontSize = '40px'
		displaySeconds.style.paddingTop = '0px'
		displaySeconds.style.height = '46px'
		buttonCancelFinish.style.color = 'rgba(255, 255, 255, 0.2)'
		cancelFinish = false
		finishRun = false
		zeroIsReached = false
		stopButton()
		drawTime()
	}
}
function displayMain() {
	//console.log('Main Func')
	display = 'main'
	fPreview = false
	checkboxFinish.checked = false
	settingsButton.style.color = 'white'
	buttonTimeReset.style.color = 'white'
	buttonMReset.style.color = 'white'
	buttonCancelFinish.style.color = 'rgba(255, 255, 255, 0.2)'
	mainDisplay.style.display = 'block'
	mainTopStartStopCancelFinishButtons.style.display = 'block'
	mainSettingsTopDisplay.style.display = 'none'
	fontSettingsDisplay.style.display = 'none'
	displaySettingsDisplay.style.display = 'none'
	finishSettingsDisplay.style.display = 'none'
	drawTime()
}
function displayFontSettings() {
	//console.log('Font Func')
	fPreview = false
	checkboxFinish.checked = false
	settingsButton.style.color = 'red'
	display = 'settings'
	settingsChoice = 'font'
	mainTopStartStopCancelFinishButtons.style.display = 'none'
	buttonFontSettings.style.color = 'red'
	buttonColorSettings.style.color = 'white'
	buttonFinishSettings.style.color = 'white'
	mainDisplay.style.display = 'none'
	mainSettingsTopDisplay.style.display = 'block'
	fontSettingsDisplay.style.display = 'block'
	displaySettingsDisplay.style.display = 'none'
	finishSettingsDisplay.style.display = 'none'
	drawTime()
}
function displayDisplaySettings() {
	settingsButton.style.color = 'red'
	display = 'settings'
	settingsChoice = 'display'
	fPreview = false
	checkboxFinish.checked = false
	buttonFontSettings.style.color = 'white'
	buttonColorSettings.style.color = 'red'
	buttonFinishSettings.style.color = 'white'
	mainTopStartStopCancelFinishButtons.style.display = 'none'
	mainDisplay.style.display = 'none'
	mainSettingsTopDisplay.style.display = 'block'
	fontSettingsDisplay.style.display = 'none'
	displaySettingsDisplay.style.display = 'block'
	finishSettingsDisplay.style.display = 'none'
	drawTime()
}
function displayFinishSettings() {
	settingsButton.style.color = 'red'
	display = 'settings'
	settingsChoice = 'finish'
	buttonFontSettings.style.color = 'white'
	buttonColorSettings.style.color = 'white'
	buttonFinishSettings.style.color = 'red'
	mainDisplay.style.display = 'none'
	mainTopStartStopCancelFinishButtons.style.display = 'none'
	mainSettingsTopDisplay.style.display = 'block'
	fontSettingsDisplay.style.display = 'none'
	displaySettingsDisplay.style.display = 'none'
	finishSettingsDisplay.style.display = 'block'
	drawTime()
}
function startButton() {
	if (buttonStart.buttonPressed || finishRun || !displayYN) return
	cancelFinish = false
	fPreview = false
	buttonStart.buttonPressed = true
	displayMain()
	buttonStart.style.color = 'red'
	buttonStop.style.color = 'white'
	displayOffOnButton.style.color = 'rgba(255, 255, 255, 0.2)'
	buttonCancelFinish.style.color = 'rgba(255, 255, 255, 0.2)'
	settingsButton.style.color = 'rgba(255, 255, 255, 0.2)'
	buttonTimeReset.style.color = 'rgba(255, 255, 255, 0.2)'
	buttonMReset.style.color = 'rgba(255, 255, 255, 0.2)'
	timer = setInterval(startCountdown, 1000)
	//console.log('Start Function Finished')
}
function mainPanelButtonsOff() {
	buttonStop.style.color = 'rgba(255, 255, 255, 0.2)'
	settingsButton.style.color = 'rgba(255, 255, 255, 0.2)'
	buttonTimeReset.style.color = 'rgba(255, 255, 255, 0.2)'
	buttonMReset.style.color = 'rgba(255, 255, 255, 0.2)'
}
function stopButton() {
	if (finishRun || !displayYN) return
	buttonStart.buttonPressed = false
	buttonStart.style.color = 'white'
	buttonStop.style.color = 'white'
	settingsButton.style.color = 'white'
	buttonTimeReset.style.color = 'white'
	buttonMReset.style.color = 'white'
	displayOffOnButton.style.color = 'White'
	clearInterval(timer)
}
function resetTimeButton() {
	if (buttonStart.buttonPressed || finishRun || !displayYN) return
	buttonStart.style.color = 'white'
	buttonStop.style.color = 'white'
	buttonTimeReset.style.color = 'white'
	buttonMReset.style.color = 'white'
	timeHS = 3
	displayDays.style.display = 'none'
	colonDH.style.display = 'none'
	displayHours.style.display = 'none'
	colonHM.style.display = 'none'
	day = 0
	hour = 0
	min = 0
	sec = 0
	drawTime()
}
function resetMessButton() {
	if (buttonStart.buttonPressed || finishRun || !displayYN) return
	zeroIsReached = false
	messBT = ''
	messAT = ''
	messF = ''
	secFinish = 0
	inputBeforeTime.checked = false
	inputAfterTime.checked = false
	inputFinishMess.checked = false
	inputOffNum.checked = false
	messBTYN = false
	messATYN = false
	messFYN = false
	secFinishYN = false
	drawTime()
}
function zeroReached() {
	zeroIsReached = true
	finishRun = true
	stopButton()
	clearInterval(timer)
	drawTime()
}
function startCountdown() {
	//console.log('countdown')
	if (day == 0 && hour == 0 && min == 0 && sec == 0) {
		zeroReached()
		return
	}
	if (sec >= 1) {
		sec -= 1
		drawTime()
		return
	}
	if (sec == 0 && min >= 1 && hour >= 1 && day >= 1) {
		sec = 59
		min -= 1
		drawTime()
		return
	}
	if (sec == 0 && min >= 1 && hour >= 1 && day == 0) {
		sec = 59
		min -= 1
		drawTime()
		return
	}
	if (sec == 0 && min >= 1 && hour == 0 && day == 0) {
		sec = 59
		min -= 1
		drawTime()
		return
	}
	if (sec == 0 && min == 0 && hour >= 1) {
		sec = 59
		min = 59
		hour -= 1
		drawTime()
		return
	}
	if (sec == 0 && min == 0 && hour == 0 && day >= 1) {
		sec = 59
		min = 59
		hour = 23
		day -= 1
		drawTime()
		return
	}
}
