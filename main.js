const API_URL = 'http://127.0.0.1:8000/events';

async function get_events(){
    try{
        response = await fetch(API_URL)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const events = await response.json();
        return events;
    }
    catch (error){
        console.error("an error occured",error)
        return null
    }
}

function convertArrayToEvent(eventArray) {
    // Check if it's an array and has the right structure
    if (!Array.isArray(eventArray) || eventArray.length < 5) {
        console.error('Invalid event array:', eventArray);
        return null;
    }
    
    // Parse tags - remove brackets and quotes, split by commas
    let tags = [];
    if (eventArray[4] && typeof eventArray[4] === 'string') {
        // Remove [ and ] and ' characters, then split by comma
        const tagsString = eventArray[4].replace(/[\[\]']/g, '');
        tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    return {
        id: eventArray[0],
        country: eventArray[1],
        city: eventArray[2],
        date: eventArray[3],
        tags: tags,
        title: eventArray[5],
        description: eventArray[6]
    };
}

function add_event_card(event){
    event = convertArrayToEvent(event)
    const eventdate = new Date(event.date)
    const formatteddate = eventdate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    tagsHTML = event.tags && event.tags.length > 0 ? event.tags.map(tag => `<span class="event-tag">${tag}</span>`).join(''): ''
    return `
    <div class="event-card" onclick="handleEventClick(${event.id})">
        <div class="card-title">
            <h2 class="card-title">${event.title}</h2>
            <span class="card-date">${formatteddate}</span>
        </div>
        <div class="card-location">location: ${event.city}, ${event.country}</div>
        <div class="card-description">${event.description}</div>
        ${tagsHTML ? `<div class="event-tags">${tagsHTML}</div>` : ''}
        <div class="card-footer">
            <span class="card-id">event #${event.id}</span>
        </div>
    </div>
    
    `

}


function handleEventClick(event){
    console.log(`event #${event} clicked`)
}


async function displayEvents() {
    const container = document.getElementById('events');
    
    // Show loading state
    container.innerHTML = '<div class="loading">Loading events...</div>';
    
    // Fetch events
    const events = await get_events();
    
    if (!events) {
        container.innerHTML = '<div class="error">Failed to load events. Please try again later.</div>';
        return;
    }
    
    if (events.length === 0) {
        container.innerHTML = '<div class="error">No events found.</div>';
        return;
    }
    
    // Create and insert event cards
    const eventsHTML = events.map(event => add_event_card(event)).join('');
    container.innerHTML = eventsHTML;
}



document.addEventListener('DOMContentLoaded', displayEvents);


