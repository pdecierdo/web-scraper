const sanitizeDate = (date) => {
    const dateSplitted = date.split(',')
    return `${ dateSplitted[1] }, 2019`
}

const sanitizePrice = (price) => {
    if (price === "Free" || !price) {
        return 0
    }
    return parseFloat(price.replace(/[^\d.-]/g, ''))
}

module.exports = {
    sanitizeDate, 
    sanitizePrice
}