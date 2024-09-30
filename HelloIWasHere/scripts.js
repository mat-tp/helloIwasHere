// Create a visitor object with username and formatted time
function createVisitor(username) {
    const currentTime = new Date();
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    const formattedTime = currentTime.toLocaleString(undefined, options);

    return {
        name: username,
        time: formattedTime
    };
}

/*
// Fetch visitors from the server
async function getVisitorsFromServer() {
    try {
        const response = await fetch('/get-visitors');
        const visitors = await response.json();
        return visitors;
    } catch (error) {
        console.error('Error fetching visitors from server:', error);
        return [];
    }
}
*/

// Fetch visitors from the server
async function getVisitorsFromServer() {
    try {
        const response = await fetch('/get-visitors');
        if (!response.ok) {
            throw new Error('Failed to fetch visitors');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching visitors from server:', error);
        alert('Failed to load visitors. Please try again later.');
        return [];
    }
}

// Add a visitor by sending data to the server
async function addVisitorToServer(visitor) {
    try {
        const response = await fetch('/save-visitor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(visitor)
        });

        // Check if the response is OK
        if (!response.ok) {
            const errorText = await response.text(); // Capture error details
            throw new Error(`Error saving visitor: ${errorText}`); // Include error details in the message
        }

        console.log('Visitor saved successfully'); // Log success message

    } catch (error) {
        console.error('Error saving visitor:', error);
        alert(`Error saving visitor: ${error.message}`); // Display detailed error to user
    }
}

/*
// Add a visitor by sending data to the server
async function addVisitorToServer(visitor) {
    try {
        const response = await fetch('/save-visitor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(visitor)
        });

        if (!response.ok) {
            throw new Error('Error saving visitor to the server');
        }
    } catch (error) {
        console.error('Error saving visitor:', error);
        alert('Error saving visitor. Please try again.');
    }
}
*/

// Display the visitors in the list
function displayVisitors(visitors) {
    const nameListDiv = document.getElementById('nameList');

    // Sort visitors by visit time (ascending order)
    visitors.sort((a, b) => new Date(a.time) - new Date(b.time));

    // Clear the current list
    nameListDiv.innerHTML = '';

    // Create a <ul> element to hold the visitor list
    const visitorList = document.createElement('ul');

    // Populate the visitor list with <li> elements
    visitors.forEach(visitor => {
        const visitorItem = document.createElement('li');
        visitorItem.textContent = `${visitor.name} was here by ${visitor.time}`;
        visitorList.appendChild(visitorItem);
    });

    // Append the <ul> to the nameListDiv
    nameListDiv.appendChild(visitorList);
}


// On button click, prompt for name and save visitor
document.getElementById('visitButton').addEventListener('click', async function () {
    //const username = prompt('Please enter your name:');
    const username = document.getElementById('userName').value.trim(); // Get value from input field
    const thankYouMessageDiv = document.getElementById('thankYouMessage'); // Reference to thank you message div
    thankYouMessageDiv.textContent = ''; // Clear any previous message

    if (username) {
        const visitor = createVisitor(username);
        await addVisitorToServer(visitor); // Send visitor data to server
        const visitors = await getVisitorsFromServer(); // Fetch updated visitors
        displayVisitors(visitors); // Display the updated list
        
        // alert('Visit recorded successfully!');
        // Set the thank you message
        thankYouMessageDiv.textContent = `Thank you, ${username}! Truly You were here! (successfully.)`;
        thankYouMessageDiv.classList.add('show');
        document.getElementById('userName').value = ''; // Clear input field after recording

    } else {
        alert('Name is required!');
    }
});


// Feedback submission section
document.getElementById('submitFeedback').addEventListener('click', async function () {
    const feedback = document.getElementById('userFeedback').value.trim();
    const thankYouMessageDiv = document.getElementById('tym-feedback');

    if (feedback) {
        try {
            const response = await fetch('/submit-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedback: feedback }),
            });

            if (!response.ok) {
                throw new Error('Error submitting feedback');
            }

            // Successful feedback submission
            thankYouMessageDiv.textContent = 'Thank you for your feedback!';
            thankYouMessageDiv.classList.add('show');

            document.getElementById('userFeedback').value = '';
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('There was an issue submitting your feedback. Please try again later.');
            thankYouMessageDiv.textContent = 'There was an issue submitting your feedback. Please try again later.';
        }
    } else {
         thankYouMessageDiv.textContent ='Please enter your feedback before submitting.';
    }
});

/*
// Function to add feedback to the feedback list
function addFeedbackToList(feedback) {
    const feedbackList = document.getElementById('feedbackList');
    const feedbackItem = document.createElement('li');
    feedbackItem.textContent = feedback;
    feedbackList.appendChild(feedbackItem);
}

// Fetch feedback from the server and display it
async function fetchAndDisplayFeedback() {
    try {
        const response = await fetch('/get-feedback');
        const feedbackData = await response.json();
        const feedbackList = document.getElementById('feedbackList');

        // Clear the existing feedback list
        feedbackList.innerHTML = '';

        // Add each feedback item to the list
        feedbackData.forEach(feedback => {
            addFeedbackToList(feedback.feedback);
        });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        alert('Failed to load feedback. Please try again later.');
    }
}

// Call fetchAndDisplayFeedback on page load
window.addEventListener('DOMContentLoaded', async () => {
    await fetchAndDisplayFeedback();
});

*/

// Fetch and display visitors on page load
window.addEventListener('DOMContentLoaded', async function () {
    const visitors = await getVisitorsFromServer();
    displayVisitors(visitors);
});
