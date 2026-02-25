const addDays = (date, days) => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() + days)
    return newDate
}

export {addDays}