// require('./db/mongoose')
// const moment = require('moment')
// const Event = require('./models/event')
// const puppeteer = require('puppeteer')
// const { sanitizeDate, sanitizePrice } = require('./utils/sanitize')

// const getAndSaveEventsViaJsonScript = async (url) => {
//     try {
//         console.log('Started saving using getAndSaveEventsViaJsonScript at ', new Date().toTimeString())
//         const browser = await puppeteer.launch()
//         const page = await browser.newPage()
//         await page.goto(url)

//         const eventsJsonScript = await page.$eval('script[type="application/ld+json"]', scriptTag => scriptTag.innerHTML)
//         const events = JSON.parse(eventsJsonScript)

//         for (let i = 0; i < events.length; i++) {
//             const event = events[i]
//             console.log(`Started saving event at ${ new Date().toTimeString() }: `, event.url)

//             const eventCreated = new Event(event)
//             eventCreated.source = 'scriptJson'
//             await eventCreated.save()

//             console.log(`Finished saving event at ${ new Date().toTimeString() }: `, eventCreated.url, '\n')
//         }

//         await browser.close()
//         return 'Finished saving using getAndSaveEventsViaJsonScript. '
//     } catch (e) {
//         throw new Error('Event saving failed')
//     }
// }

// const getAndSaveEventsFromHTMLBody = async (url) => {
//     try {
//         console.log('Started saving using getAndSaveEventsFromHTMLBody at ', new Date().toTimeString())
//         const browser = await puppeteer.launch()
//         const page = await browser.newPage()
//         await page.goto(url)

//         const names = await page.$$eval('ul.search-main-content__events-list li main.eds-media-card-content__content-container a.eds-media-card-content__action-link div[data-spec="event-card__formatted-name--content"]', ($names) => {
//             return $names.map(($name) => $name.textContent)
//         })

//         const anchors = await page.$$eval('ul.search-main-content__events-list li main.eds-media-card-content__content-container a.eds-media-card-content__action-link', ($anchors) => {
//             return $anchors.map(($anchor) => $anchor.href)
//         })

//         const images = await page.$$eval('ul.search-main-content__events-list li aside.eds-media-card-content__image-container', ($images) => {
//             return $images.map(($image) => {
//                 $image = $image.querySelector('img.eds-media-card-content__image')
//                 if (!$image) {
//                     return null
//                 }
//                 return $image.src
//             })
//         })

//         const startDates = await page.$$eval('ul.search-main-content__events-list li div.eds-media-card-content__sub-content', ($startDates) => {
//             return $startDates.map(($startDate) => $startDate.firstChild.textContent)
//         })

//         const locations = await page.$$eval('ul.search-main-content__events-list li div.eds-media-card-content__sub-content', ($locations) => {
//             return $locations.map(($location) => $location.children[1].children[0].textContent)
//         })

//         const prices = await page.$$eval('ul.search-main-content__events-list li div.eds-media-card-content__sub-content', ($prices) => {
//             return $prices.map(($price) => $price.children[1].children[1].textContent)
//         })

//         for (let i = 0; i < 20; i++) {
//             const name = names[i]
//             const url = anchors[i]
//             const image = images[i]
//             let startDate = sanitizeDate(startDates[i])
//             startDate = moment(startDate, 'MMM DD, YYYY').add(1, 'day').format('MM-DD-YYYY')
//             const lowPrice = sanitizePrice(prices[i])
//             const [ locationName, addressLocality, addressRegion ] = locations[i]

//             const eventObject = {
//                 startDate,
//                 name,
//                 url,
//                 offers: {
//                     lowPrice,
//                     url,
//                     priceCurrency: 'PHP',
//                     '@type': 'AggregateOffer'
//                 },
//                 '@type': 'Event'
//             }

//             if (locationName || addressLocality || addressRegion) {
//                 eventObject.location = {
//                     name: locationName,
//                     address: {
//                         addressLocality,
//                         addressRegion,
//                         addressCountry: {
//                             name: 'PH'
//                         },
//                         '@type': 'PostalAddress'
//                     },
//                     '@type': 'Place'
//                 }
//             }

//             if (image) {
//                 eventObject.image = image
//             }

//             const event = new Event(eventObject)

//             event.source = 'htmlBody'
//             await event.save()
//         }

//         await browser.close()

//         return 'Finished saving using getAndSaveEventsFromHTMLBody. '
//     } catch (e) {
//         throw new Error('Event saving failed')
//     }
// }

// (async () => {
//     try {
//         console.log(await getAndSaveEventsViaJsonScript('https://www.eventbrite.com/d/philippines/all-events/?page=1'), new Date().toTimeString(), '\n')
//         console.log(await getAndSaveEventsViaJsonScript('https://www.eventbrite.com/d/philippines/all-events/?page=2'), new Date().toTimeString(), '\n')
//     } catch (e) {
//         console.log(e)
//     }
// })()
const letTest = () => {
    let b = 0
    if (b === 0) {
        b = 1
    }
    console.log(b)
}
letTest()