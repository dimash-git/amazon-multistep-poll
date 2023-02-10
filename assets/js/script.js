const fields = {
    giftOrder: '#gift_lookup input[name="order_id"]', // Order ID input from Gift Lookup form
    giftFn: '#gift_lookup [name="customer_first"]',
    giftLn: '#gift_lookup [name="customer_last"]',
    clientFn: '#client_form [name="first_name"]',
    clientLn: '#client_form [name="last_name"]',
    clientGift: '#client_form input[name="gift_name"]', // Gift name hidden input for Google Spreadsheet
    clientReview: '#client_form input[name="review_left"]', // Client form hidden input if review was left
    clientAsin: '#client_form input[name="asin"]', // Client form hidden input for asin number
    clientOrder: '#client_form [name="order_id"]'
}

// HTML elements
const loader = '<img class="spinner" width="24px" height="24px" src="assets/img/spinner.svg" alt="">'
const nextIcon = '<i class="fas fa-arrow-circle-right">'

const steps = document.querySelectorAll('.step-tab-panel')

const getCurrTab = (tabs = steps) => {
    const curr = document.querySelector('.step-tab-panel.active')
    return [...tabs].indexOf(curr)
}

const tgleTab = (from, to, tabs = steps) => {
    tabs[from].classList.remove('active')
    tabs[to].classList.add('active')
}

const switchTo = (final = null, tabs = steps) => {
    const from = getCurrTab()
    const to = final ? (tabs.length-2) : (from+1)
    tgleTab(from, to)
    disableBtn()
}

const btnNext = document.querySelector('.btn-next')
const changeBtn = (elem, btn = btnNext) => {
    btn.innerHTML = elem
}
const disableBtn = (state = true, btn = btnNext) => {
    if (state) {
        btn.setAttribute('disabled', 'true')
    } else {
        btn.removeAttribute('disabled')
    }
}
btnNext.addEventListener('click', function(e) {

    e.preventDefault()
    const tabId = getCurrTab() // Get current tab id to know where we at

    switch (tabId) {
        case 0: // Gift Lookup Form

            const orderId = document.querySelector(fields.giftOrder).value
            if (!(orderId == '')) checkOrder(orderId, tabId)

            break;
        case 1: // Choose Gift Page

            (document.querySelector(fields.clientGift)).value = document.querySelector('.green-offer .title span').innerHTML
            switchTo()

            break;
        case 2: // Rating Review Page
            
            let isReviewed = false
            
            if (nStars > 3) {
                const textarea = document.querySelector('textarea[name="comment"]')
                if ((textarea.value) == '') {
                    const reviewTab = steps[3] // Click the Amazon Link Page 
                    
                    const revStepOne = reviewTab.querySelectorAll('.amazon-review-step')[0]
                    revStepOne.style.display = 'none'

                    const revStepTwo = reviewTab.querySelectorAll('.amazon-review-step')[1]
                    revStepTwo.querySelector('.amazon-review-step-title').style.display = 'none'
                    revStepTwo.style.display = 'block'
    
                    const buttonTwo = revStepTwo.querySelector('button')
                    buttonTwo.removeAttribute('disabled')
                    buttonTwo.innerHTML = buttonTwo.innerHTML.replace('Paste', 'Leave')
                }
                else {
                    isReviewed = true;
                }
                switchTo()
            } else {
                switchTo('final')
            }
            (document.querySelector(fields.clientReview)).value = isReviewed
            break;
        case 4: // Final Page: Client Form

            const form = document.querySelector("#client_form")
            const formData = new FormData(form)

            changeBtn(loader)
            
            postToSheet(formData)
            .then(data => {
                if (data.result == 'success') {
                    switchTo()
                    document.querySelector('.step-footer').style.display = 'none'
                }
            })

            break;
        default:

            switchTo()

            break;
    }
})

const checkOrder = (orderId, tabId) => {
    
    changeBtn(loader)

    getOrder(orderId).then((json) => {
        // console.log(json);
        const data = json?.data
        const purchaseDate = data?.purchase_date.split(' ')[0]
        const asin = data?.items[0].asin

        const diffInMs = new Date() - new Date(purchaseDate)
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

        if (diffInDays >= 7) { // If order was placed more than 7 days ago

            prepForm(asin)

            const order = amz.orders.find(order => order.asin == asin)
            if (order) putOrderImg(order.src) // If order exists, put image of order everywhere

            getSheet(orderId).then(text => {
                const json = JSON.parse(text.substring(47).slice(0, -2))
                if (json.table.rows.length == 0) { // If no similar order is present in spreadsheet

                    document.querySelector('#gift-link').setAttribute(
                        'href',
                        `https://www.amazon.com/review/review-your-purchases/?_encoding=UTF8&asin=${asin}`
                    )

                    switchTo()

                    changeBtn('Next ' + nextIcon)

                } else {
                    setError('Order has no gifts')
                    changeBtn('Try Again ' + nextIcon)
                }
            })

        } else { // If order is new (less than 7 days)
            setError('Oh no, it looks like your order is too recent to process!')
            changeBtn('Try Again ' + nextIcon)
        }
    })
}

const errorElem = document.querySelector('#gift_lookup .error')
const setError = (text = null, style = 'block') => {
    if (text) errorElem.innerHTML = text
    errorElem.style.display = style
}

async function getOrder(orderId) {
    // https://data.seller.tools/api/docs
    const token = config.token
    const dataSellerUrl = 'https://data.seller.tools/api/v1/orders/' + orderId

    const response = await fetch(dataSellerUrl, {
        method: 'get',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        }
    })

    if (!response.ok) {
        setError('Invalid order ID or did not find it')
        changeBtn('Try Again ' + nextIcon)

        const message = `An error has occured: ${response.status}`
        throw new Error(message)
    }

    const json = await response.json()
    return json

}

async function getSheet(orderId) {
    const sheetId = config.sheetId
    const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?` // gviz - google visualization
    const sheetName = 'Sheet1'
    const query = encodeURIComponent(`Select * WHERE B = "${orderId}"`)
    const url = `${base}&sheet=${sheetName}&tq=${query}`

    const response = await fetch(url)
    const text = await response.text()
    return text
}

async function postToSheet(formData) {
    const endpoint = config.appScriptUrl

    const response = await fetch(endpoint, { 
        method: 'POST',
        body: formData
    })

    if (!response.ok) {
        const message = `An error has occured: ${response.status}`
        throw new Error(message)
    }

    const json = await response.json()
    return json
}

const prepForm = (asin = null) => {
    document.querySelector(fields.clientFn).value = document.querySelector(fields.giftFn).value
    document.querySelector(fields.clientLn).value = document.querySelector(fields.giftLn).value
    document.querySelector(fields.clientOrder).value = document.querySelector(fields.giftOrder).value
    if (asin) document.querySelector(fields.clientAsin).value = asin
}

const stepCopyReview = document.querySelector('.amazon-review #gift-step-1'),
    stepLeaveReview = document.querySelector('.amazon-review #gift-step-2')

stepCopyReview.addEventListener('click', function() {
    const textarea = document.querySelector('textarea[name="comment"]')
    if (!(textarea.value == '')) {
        navigator.clipboard.writeText(textarea.value)
        .then(() => {
            console.log('Text copied to clipboard');
            stepLeaveReview.removeAttribute('disabled')
        })
        .catch(err => {
            console.error('Error in copying text: ', err);
        });
    }
})
stepLeaveReview.addEventListener('click', function() {
    setTimeout(function() {
        disableBtn(false)
    }, 7000)
})

document.querySelector('.wo-review').addEventListener('click', function() {
    switchTo('final')
})

// Put Order image on all pages where it is available
const putOrderImg = (src) => {
    document.querySelectorAll('.order-image img').forEach(orderImg => {
        orderImg.setAttribute('src', src)
    })
}

// Component
const OfferCard = (name, width, src) => {
    return `<div class="offer">
        <div class="offer-image">
            <img src="${src}" width="${width}" alt="">
        </div>
        <div class="title"><span>${name}</span> -FREE-</div>
    </div>`
}

// Put Gifts into Gift Select Page
const putGifts = (gifts) => {
    gifts.forEach(gift => {
        document.querySelector('.free-gift-offers').innerHTML += OfferCard(gift.name, gift.width, gift.src)
    })
}
putGifts(amz.gifts)

// On offer click change color to make it active
const iterateOffers = () => {
    document.querySelectorAll('.offer').forEach(offer => {
        offer.addEventListener('click', function() {
            clickOffer(this)
        })
    })
}
const clickOffer = (offer) => {
    const greenOffer = document.querySelector('.green-offer')
    if (greenOffer) greenOffer.classList.remove('green-offer')
    offer.classList.add('green-offer')
    disableBtn(false)
}
iterateOffers()

// Check if Forms were filled before proceeding
const forms = ['#client_form', '#gift_lookup']
const iterateForms = (forms) => {
    forms.forEach(form => {
        document.querySelector(form).addEventListener('change', function(){
            if (validateForm(this)) disableBtn(false)
        })
    })
}
const validateForm = (form) => {
    const inputs = form.querySelectorAll('[required]')
    if (inputs.length > 0) {
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i]
            if (input.value == '') return false
        }
    }
    return true
}
iterateForms(forms)

// Star Rating Function
let nStars = 0
const stars = document.querySelectorAll('.star-rating s')
const iterateStars = (stars) => {
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const n = parseInt(star.dataset.star) // turn string to int, integer comparison further
            nStars = n
            glowStars(n, stars)
            disableBtn(false)
        })
    })
}
const glowStars = (n, stars) => {
    const activeStars = document.querySelectorAll('.star-rating s.active')
    activeStars.forEach(star => {
        star.classList.remove('active')
    })
    stars.forEach((star, idx) => {
        if (idx < n) star.classList.add('active')
    })
}
iterateStars(stars)