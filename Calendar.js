const fs = require('fs');
const moment = require('moment')

class Calendar {

  constructor(data) {
    this.data = data;
  }

  getAvailableSpotsByDate(date, duration) {
    return this.getFormattedSlots(
      this.getRealSlotsByDate(date), 
      this.getISODate(date), 
      duration
    );
  }

  getRealSlotsByDate(date) {

    const daySlots = this.getAllDaySlots(date);
    const sessions = this.getSessionsByDate(date);
    const ISODate = this.getISODate(date);

    const realSpots = []
    
    daySlots.forEach(daySlot => {
      if (sessions) {
        let noConflicts = true
        let start = moment(ISODate + ' ' + daySlot.start).valueOf()
        let end = moment(ISODate + ' ' + daySlot.end).valueOf()

        sessions.forEach(sessionSlot => {
          let sessionStart = moment(ISODate + ' ' + sessionSlot.start).valueOf()
          let sessionEnd = moment(ISODate + ' ' + sessionSlot.end).valueOf()
          
          if (sessionStart > start && sessionEnd < end) {
            realSpots.push({ start: daySlot.start, end: sessionSlot.start})
            realSpots.push({ start: sessionSlot.end, end: daySlot.end})
            noConflicts = false
          } else if (sessionStart === start && sessionEnd < end) {
            realSpots.push({ start: sessionSlot.end, end: daySlot.end})
            noConflicts = false
          } else if (sessionStart > start && sessionEnd === end) {
            realSpots.push({ start: daySlot.start, end: sessionSlot.start})
            noConflicts = false
          } else if (sessionStart === start && sessionEnd === end) {
            noConflicts = false
          }
        })
        if (noConflicts) {
          realSpots.push(daySlot)
        }
      } else {
        realSpots.push(daySlot)
      }
    })

    return realSpots;
  }

  getAllDaySlots(date) {  
    return this.data.slots[date] || [];
  }

  getSessionsByDate(date) {
    return this.data.sessions[date] || null;
  }

  getFormattedSlots(slots, ISODate, duration) {
    const formattedSlots = [];
    let resultSlot;

    slots.forEach((slot) => {
      let start = slot.start;
      do {
        resultSlot = this.getOneMiniSlot(start, slot.end, ISODate, duration);
        if (resultSlot) {
          formattedSlots.push(resultSlot);
          start = moment.utc(resultSlot.endHour).format('HH:mm')
        }
      } while (resultSlot);
    });

    return formattedSlots;
  }

  getOneMiniSlot(startSlot, endSlot, ISODate, duration) {
    const startHourFirst = this.getMomentHour(ISODate, startSlot);
    const endHour = this.getMomentWithMinutes(startHourFirst, this.data.durationBefore + duration + this.data.durationAfter);

    if (moment.utc(endHour, 'HH:mm').valueOf() > moment.utc(endSlot, 'HH:mm').valueOf()) {
      return null;
    } 
    return {
      startHour: moment.utc(ISODate + ' ' + startHourFirst.format('HH:mm')).toDate(),
      endHour: moment.utc(ISODate + ' ' + endHour).toDate(),
      clientStartHour: moment.utc(ISODate + ' ' +  this.getMomentWithMinutes(startHourFirst, this.data.durationBefore)).toDate(),
      clientEndHour: moment.utc(ISODate + ' ' + this.getMomentWithMinutes(startHourFirst, duration)).toDate(),
    };
  }

  getISODate(date) {
    return moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD')
  }
  
  getMomentHour(ISODate, hour) {
    return moment(ISODate + ' ' + hour);
  }

  getMomentWithMinutes(hour, minutes) {
    return moment(hour).add(minutes, 'minutes').format('HH:mm');
  }
}

const getAvailableSpots = (calendar, date, duration) => {

  if (!/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    throw new Error('Invalid date format. Expected format is DD-MM-YYYY');
  }

  const filePath = './calendars/calendar.' + calendar + '.json';

  if (!fs.existsSync(filePath)) {
    throw new Error('File does not exist');
  }

  const data = JSON.parse(fs.readFileSync(filePath));

  const calendarInstance = new Calendar(data);
  const availableSpots = calendarInstance.getAvailableSpotsByDate(date, parseInt(duration)); 

  return availableSpots
}

module.exports = { getAvailableSpots }
