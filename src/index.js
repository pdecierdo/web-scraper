require('./db/mongoose')
const { sanitizeDate, sanitizePrice } = require('./utils/sanitize')
const fs = require('fs')
const moment = require('moment')
const parseJson = require('parse-json')
const axios = require('axios')
const cheerio = require('cheerio')
const Event = require('./models/event')
const jwt = require('jsonwebtoken')
const jwtData = { appName: 'eventDetailsCrawler' }
const nodemailer = require('nodemailer')

const convertImageToBase64 = async (imageUrl) => {
    try{
        let image = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        let returnedB64 = Buffer.from(image.data).toString('base64');
        return returnedB64
    } catch (e) {
        console.log(e)
    }
}

const getEventNickname = (url) => {
    const urlSplitted = url.split('/')
    return urlSplitted[urlSplitted.length - 1].split('?')[0]
}

const uploadEventImages = async () => {
    try {
        const notUploadedEvents = await Event.find( { imageCdnUrl: null })
        for (let notUploadedEvent of notUploadedEvents) {
            if (notUploadedEvent.image) {
                console.log(`Uploading image ${ notUploadedEvent.image }`)
                const imageFile = await convertImageToBase64(notUploadedEvent.image)
                const eventNickName = getEventNickname(notUploadedEvent.url)
                const fileName = `${ eventNickName }.jpg`
                const publishedBy = 'eventbrite'
                const eventDate = moment(notUploadedEvent.startDate).format('YYYYMMDD')
        
                const bodyData = {
                    imageFile,
                    fileName,
                    publishedBy,
                    eventNickName,
                    eventDate
                }
        
                const imageCdnUrl = await uploadImageToServer(bodyData)
                notUploadedEvent.imageCdnUrl = imageCdnUrl
                await notUploadedEvent.save()
    
                console.log(`Done saving image, CDN url: ${ imageCdnUrl }`, '\n')
            }
            else{
                console.log('Image url of event does not exist')
            }
        }
    } catch (e) {
        console.log(e.message)
    }
}

const uploadImageToServer = async (bodyData) => {
    try {
        const url = 'https://api.ihdevs.com/fileUpload/api/uploadThirdPartyImages'
        const bearerToken = jwt.sign(jwtData, 'fileUploadService')

        const response = await axios({
            method: 'POST',
            url,
            data: bodyData,
            headers: { 
                Authorization: `Bearer ${ bearerToken }`
            }
        })

        return Promise.resolve(response.data.data)
    } catch (e) {
        throw new Error(e.message)
    }
}

const extractModelJSONString = (data) => {
    try {
        const mediatorSplit = data.split('mediator.set(\'ticketOrderOptions\', ')[1].split('options: {')[1].split('model:')[1]
        if (!mediatorSplit) {
            return
        }
        
        const ticketOrderOptionsJsonString = mediatorSplit.split('})')[0]
        return `{ "model": ${ ticketOrderOptionsJsonString.replace(/(collection[\s]*:)+/g, '"collection":') } }`
    } catch (e) {
        console.log('There was an error in getting the JSON string.')
    }
}

const parseJsonOfModel = (jsonString)  => {
    try {
        const modelJson = parseJson(jsonString)
        return modelJson
    } catch (e) {
        console.log('There was an error in parsing the JSON string.')
    }
}

const extractFromTicketOrderOptionsJsonString = (value, jsonString) => {
    if (value === 'collection') {
        jsonString = jsonString.split('"collection":')[1].trim()
        return `{"collection": ${ jsonString.slice(0, jsonString.length - 2) }}`
    }
    if (value === 'model') {
        jsonString = jsonString.split('"model":')[1].split('"collection":')[0].trim()
        return `{"model": ${ jsonString.slice(0, jsonString.length - 1) }}`
    }
}

const fetchMoreEventDetails = async (url) => {
    try {
        console.log('Fetching more event details: ', new Date().toTimeString())
        const event = await Event.findOne({ url })
        const response = await axios.get(url)
        const $ = cheerio.load(response.data)

        const eventDetailsJsonString = $('script[type="application/ld+json"]').html()
        const eventDetailsJsonStringCleaned = eventDetailsJsonString.trim().replace(/[\n\r]+/g, '\\n').replace(/\t/g, '\\t')
        const eventDetailsJson = parseJson(eventDetailsJsonStringCleaned)

        let ticketOrderOptionsJson = {}
        let ticketOrderOptionsModel = {}
        let ticketOrderOptionsCollectionString = ''

        const ticketOrderOptionsJsonString = extractModelJSONString(response.data)

        if (ticketOrderOptionsJsonString) {
            ticketOrderOptionsJson = parseJsonOfModel(ticketOrderOptionsJsonString)
            if (!ticketOrderOptionsJson) {
                ticketOrderOptionsJson = {}
                ticketOrderOptionsModel.raw = extractFromTicketOrderOptionsJsonString('model', ticketOrderOptionsJsonString)
                ticketOrderOptionsCollectionString = extractFromTicketOrderOptionsJsonString('collection', ticketOrderOptionsJsonString)
            }
        }

        if (Object.keys(ticketOrderOptionsJson).length !== 0) {
            ticketOrderOptionsCollectionString = `{"collection": ${ JSON.stringify(ticketOrderOptionsJson.collection) }}`
            ticketOrderOptionsModel = ticketOrderOptionsJson.model
            ticketOrderOptionsModel.raw = `{"model": ${ JSON.stringify(ticketOrderOptionsJson.model) }}`
        }
        
        event.ticketOrderOptionsCollectionString = ticketOrderOptionsCollectionString
        event.ticketOrderOptionsModel = ticketOrderOptionsModel
        event.ticketOrderOptions = ticketOrderOptionsJsonString
        eventDetailsJson.raw = eventDetailsJsonStringCleaned
        event.eventDetails = eventDetailsJson
        event.image = eventDetailsJson.image
        event.description = eventDetailsJson.description
        event.ticketOrderOptionsModel.offers = eventDetailsJson.offers
        
        const modifiedEvent = await event.save()

        console.log('Finished fetching more event details: ', new Date().toTimeString())

        return Promise.resolve(modifiedEvent)
    } catch (e) {
        console.log(e)
    }
}

const compareValuesAndUpdate = async (event) => {
    try {
        console.log('Comparing event fields')

        const response = await axios.get(event.url)
        const $ = cheerio.load(response.data)
    
        const eventDetailsJsonString = $('script[type="application/ld+json"]').html()
        const eventDetailsJsonStringCleaned = eventDetailsJsonString.trim().replace(/[\n\r]+/g, '\\n').replace(/\t/g, '\\t')
        const eventDetailsJson = parseJson(eventDetailsJsonStringCleaned)
    
        const eventUpdateObject = {}
    
        if (eventDetailsJson.name !== event.name) {
            eventUpdateObject.name = eventDetailsJson.name
        }

        if (eventDetailsJsonStringCleaned !== event.eventDetails.raw) {
            eventUpdateObject.eventDetails = {
                raw: eventDetailsJsonStringCleaned
            }
        }

        if (eventDetailsJson.image !== event.image) {
            eventUpdateObject.image = eventDetailsJson.image
        }

        if (eventDetailsJson.description !== event.description) {
            eventUpdateObject.description = eventDetailsJson.description
        }

        const ticketOrderOptionsJsonString = extractModelJSONString(response.data)

        // Comparing of ticketOrderOptionsModel.raw
        
        // if (ticketOrderOptionsJsonString) {
        //     const ticketOrderOptionsJson = parseJsonOfModel(ticketOrderOptionsJsonString)
        //     let modelRawString = ''
        //     if (ticketOrderOptionsJson) {
        //         modelRawString = `{"model": ${ JSON.stringify(ticketOrderOptionsJson.model) }}`
        //         console.log('ticketOrdersOptionsJson exists')
        //     }
        //     else {
        //         modelRawString = extractFromTicketOrderOptionsJsonString('model', ticketOrderOptionsJsonString)
        //         console.log('ticketOrdersOptionsJson does not exist')
        //     }
        //     if (modelRawString.trim().replace(/[\s]+/g, '') !== event.ticketOrderOptionsModel.raw.trim().replace(/[\s]+/g, '')) {
        //         eventUpdateObject.ticketOrderOptionsModel = {
        //             raw: modelRawString
        //         }
        //     }
        // }

        if (Object.keys(eventUpdateObject).length !== 0) {
            eventUpdateObject.dateUpdated = new Date().getTime()
            const eventUpdated = await Event.findByIdAndUpdate(event.id, eventUpdateObject)
            if (!eventUpdated) {
                return console.log('Failed to update event')
            }

            console.log('Successfully updated event!', '\n')
            console.log(eventUpdateObject)
            return Promise.resolve(eventUpdated)
        }

        console.log('No changes detected.', '\n')
    } catch (e) {
        console.log(e)
    } 
}

const createOrUpdateEvents = async (events) => {
    const savedEvents = []
    for (let event of events) {
        try{
            // If event already exists, update
            const existingEvent = await Event.findOne({ url: event.url, name: event.name })
            if(existingEvent) {
                console.log('Event already saved: ', event.url, '\n')
                const updatedEvent = await compareValuesAndUpdate(existingEvent)
                if (updatedEvent) {
                    savedEvents.push({
                        method: 'update',
                        url: updatedEvent.url
                    })
                }
            }
            // If event does not exist, save to database and fetch additional details per page
            else{
                console.log('Saving event: ', new Date().toTimeString())
                console.log(event.url)

                const eventCreated = new Event(event)
                eventCreated.source = 'scriptJson'
                eventCreated.dateCreated = new Date().getTime()
                await eventCreated.save()
                const modifiedEvent = await fetchMoreEventDetails(event.url)

                if (modifiedEvent) {
                    savedEvents.push({
                        method: 'create',
                        url: modifiedEvent.url
                    })
                }

                console.log('Finished saving event: ', new Date().toTimeString(), '\n')
            }
        } catch (e) {
            console.log('Event was not saved', e)
        }
    }
    return Promise.resolve(savedEvents)
}

const getAndSaveEventsViaJsonScript = async (url) => {
    try {
        console.log('Started saving using getAndSaveEventsViaJsonScript at ', new Date().toTimeString())
        console.log(url, '\n')

        const response = await axios.get(url)
        const $ = cheerio.load(response.data)

        // Getting of array of JSON within a script (String) and parse it to JSON
        const eventJSONString = $('script[type="application/ld+json"]').html()
        const events = JSON.parse(eventJSONString)

        const savedEvents = await createOrUpdateEvents(events)

        console.log('\n', url)
        console.log('Finished saving using getAndSaveEventsViaJsonScript at ', new Date().toTimeString(), '\n')
        return Promise.resolve(savedEvents)
    } catch (e) {
        throw new Error('Event saving failed')
    }
}

const getAndSaveEventsViaStringManipulation = async (url) => {
    try {
        console.log('Started saving using getAndSaveEvents at ', new Date().toTimeString())
        const response = await axios.get(url)

        const idxHead = response.data.indexOf('<script type="application/ld+json">')
        const idxTail = response.data.indexOf('>', idxHead)
        const endScriptTagIdx = response.data.indexOf('</script>', idxTail)

        const events = JSON.parse(response.data.slice(idxTail + 1, endScriptTagIdx))

        events.forEach(async (event) => {
            try{
                const eventCreated = new Event(event)
                eventCreated.source = 'scriptJson'
                await eventCreated.save()
            } catch (e) {
                console.log(e)
            }
        })
    } catch (e) {
        console.log(e)
    }
}

const getAndSaveEventsFromHTMLBody = async (url) => {
    try {
        console.log('Started saving using getAndSaveEventsFromHTMLBody at ', new Date().toTimeString())
        const response = await axios.get(url)
        const $ = cheerio.load(response.data)

        const names = $('ul.search-main-content__events-list li main.eds-media-card-content__content-container a.eds-media-card-content__action-link')
        const images = $('ul.search-main-content__events-list li aside.eds-media-card-content__image-container')
        const subcontents = $('ul.search-main-content__events-list li div.eds-media-card-content__sub-content')

        for (let i = 0; i < 20; i++) {
            const name = $(names[i]).find('div[data-spec="event-card__formatted-name--content"]').text()
            const url = $(names[i]).attr('href')
            const image = $(images[i]).find('img.eds-media-card-content__image').attr('src')
            let startDate = sanitizeDate($(subcontents[i]).children().first().text())
            startDate = moment(startDate, 'MMM DD, YYYY').add(1, 'day').format('MM-DD-YYYY')
            const lowPrice = sanitizePrice($(subcontents[i]).find('div:nth-child(2)').find('div:nth-child(2)').first().text())
            const [ locationName, addressLocality, addressRegion ] = $(subcontents[i]).find('div:nth-child(2)').find('div:nth-child(1)').first().text().split(',')

            const event = new Event({
                startDate,
                name,
                url,
                image,
                offers: {
                    lowPrice,
                    url,
                    priceCurrency: 'PHP',
                    '@type': 'AggregateOffer'
                },
                location: {
                    name: locationName,
                    address: {
                        addressLocality,
                        addressRegion,
                        addressCountry: {
                            name: 'PH'
                        },
                        '@type': 'PostalAddress'
                    },
                    '@type': 'Place'
                },
                '@type': 'Event'
            })

            event.source = 'htmlBody'
            try{
                await event.save()
            } catch (e) {
                console.log('Event was not saved: ', e)
            }
        }
        return 'Finished saving using getAndSaveEventsFromHTMLBody. '
    } catch (e) {
        throw new Error('Event saving failed')
    }
}

const getEndPageNumber = async (url) => {
    const response = await axios.get(url)
    const $ = cheerio.load(response.data)

    const linkContent = $('div.paginator__link a').text()

    return Promise.resolve(parseInt(linkContent))
}

const sendEmail = async (message, recipient) => {
    try {
        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'notification@itemhound.com',
                pass: 'n0t!fym333!'
            }
        })
    
        let emailSent = await transporter.sendMail({
            from: 'Notification <notification@itemhound.com>',
            to: 'psdecierdo@gmail.com',
            subject: 'Updates Re Event Saving',
            text: message
        })
    } catch (e) {
        console.log(e)
    }
}

// Anonymous MAIN Function
(async () => {
    try {
        let savedEvents = []
        const numOfPages = await getEndPageNumber('https://www.eventbrite.com/d/philippines/all-events/?page=1')

        for (let i = 1; i <= numOfPages; i++) {
            const savedEventsList = await getAndSaveEventsViaJsonScript(`https://www.eventbrite.com/d/philippines/all-events/?page=${ i }`)
            savedEvents = savedEvents.concat(savedEventsList)
        }

        uploadEventImages()
        
        const createdEvents = savedEvents.map((event) => {
            if (event.method === 'create') {
                return event.url
            }
        })

        const updatedEvents = savedEvents.map((event) => {
            if (event.method === 'update') {
                return event.url
            }
        })
        console.log(createdEvents)

        sendEmail(`Created events: \n${ createdEvents.join('\n') }\nUpdated events:\n${ updatedEvents.join('\n')}`)
    } catch (e) {
        console.log(e)
    }
})()