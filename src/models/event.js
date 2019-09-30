const mongoose = require('mongoose')

const offerSchema = new mongoose.Schema({
    _id: false,
    url: {
        type: String
    },
    lowPrice: {
        type: Number
    },
    highPrice: {
        type: Number
    },
    '@type': {
        type: String
    },
    priceCurrency: {
        type: String,
        trim: true
    },
    availabilityStarts: {
        type: Date
    },
    availabilityEnds: {
        type: Date
    },
    validFrom: {
        type: Date
    },
    name: {
        type: String
    },
    price: {
        type: Number
    },
    availability: {
        type: String
    }
})

const locationSchema = new mongoose.Schema({
    _id: false,
    address: {
        addressLocality: {
            type: String,
            trim: true
        },
        addressRegion: {
            type: String,
            trim: true
        },
        streetAddress: {
            type: String,
            trim: true
        },
        addressCountry: {
            name: {
                type: String,
                trim: true
            }
        },
        '@type': {
            type: String
        }
    },
    geo: {
        latitude: {
            type: Number
        }, 
        longitude: {
            type: Number
        },
        '@type': {
            type: String
        }
    },
    '@type': {
        type: String
    },
    name: {
        type: String
    }
})

const eventSchema = new mongoose.Schema({
    startDate: {
        type: Date,
        trim: true
    },
    endDate: {
        type: Date,
        trim: true
    },
    name: {
        type: String,
        trim: true
    },
    url: {
        type: String,
        trim: true
    },
    image: {
        type: String
    },
    imageCdnUrl: {
        type: String
    },
    offers: [
        offerSchema
    ],
    location: {
        address: {
            addressLocality: {
                type: String,
                trim: true
            },
            addressRegion: {
                type: String,
                trim: true
            },
            streetAddress: {
                type: String,
                trim: true
            },
            addressCountry: {
                name: {
                    type: String,
                    trim: true
                }
            },
            '@type': {
                type: String
            }
        },
        geo: {
            latitude: {
                type: Number
            }, 
            longitude: {
                type: Number
            },
            '@type': {
                type: String
            }
        },
        '@type': {
            type: String
        },
        name: {
            type: String
        }
    },
    '@context': {
        type: String
    },
    '@type': {
        type: String
    },
    description: {
        type: String
    },
    ticketOrderOptions: {
        type: String
    },
    ticketOrderOptionsModel: {
        raw: {
            type: String
        },
        display_date: {
            type: String
        },
        offers: [
            offerSchema
        ]
    },
    ticketOrderOptionsCollectionString: {
        type: String
    },
    eventDetails: {
        raw: {
            type: String
        },
        startDate: {
            type: Date
        },
        endDate: {
            type: Date
        },
        name: {
            type: String
        },
        organizer: {
            url: {
                type: String
            },
            '@type': {
                type: String
            },
            name: {
                type: String
            },
            description: {
                type: String
            }
        }
    },
    dateCreated: {
        type: Date
    },
    dateUpdated: {
        type: Date
    },
    source: {
        type: String
    }
})

// userSchema.virtual('tasks', {
//     ref: 'Task',
//     localField: '_id',
//     foreignField: 'owner'
// })

// userSchema.methods.generateAuthToken = async function () {
//     const user = this
//     const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET)
    
//     user.tokens = user.tokens.concat({ token })
//     await user.save()
    
//     return token
// }

// userSchema.methods.toJSON = function () {
//     const user = this
//     const userObject = user.toObject()

//     delete userObject.password
//     delete userObject.tokens
//     delete userObject.avatar

//     return userObject
// }

// userSchema.statics.findByCredentials = async (email, password) => {
//     const user = await User.findOne({ email })

//     if(!user){
//         throw new Error('Unable to login')
//     }

//     const isMatch = await bcrypt.compare(password, user.password)

//     if(!isMatch){
//         throw new Error('Unable to login')
//     }

//     return user
// }

// Hash the plain text password before saving
// userSchema.pre('save', async function (next) {
//     const user = this

//     if(user.isModified('password')){
//         user.password = await bcrypt.hash(user.password, 8)
//     }
//     next()
// })

// userSchema.pre('remove', async function (next) {
//     const user = this
//     await Task.deleteMany({
//         owner: user._id
//     })
//     next()
// })

const Event = mongoose.model('Event', eventSchema)

module.exports = Event