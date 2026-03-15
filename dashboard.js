const API_URL = "https://events-api-production-4a05.up.railway.app";

token = localStorage.getItem("AdaptToken");

let currentUser = {};

async function verify_token(){
    if (! token){
        window.location.href = 'login.html';
    }
    try {
    response = await fetch(`${API_URL}/verify_token/${token}`);

    if (!response.ok) {
        console.error("Token verification failed");
        localStorage.removeItem('AdaptToken');
        window.location.href = 'login.html';
        return false;
    }

    res = await response.json();

    if (res){
        currentUser = {
            name: res["sub"],
            committee: res["committee"],
            isAdmin: res["role"] ,
            id: res["user_id"]
        };
    }
    else{
        window.location.href = 'login.html';
    }
    }
    catch (erorr){
        console.error("")
    }
    
}




async function get_completed_tasks() {
    const userId = currentUser["id"];
    try {
        const response = await fetch(`${API_URL}/task_status/${userId}`);
        const result = await response.json();
        if (result["completed_tasks"].length != 0){
        return JSON.parse(result["completed_tasks"]);
        }
        return []
    } catch (error) {
        console.error("Error fetching completed tasks:", error);
        return { completed_tasks: [] };
    }
}

function initNavbar() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });

    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
}

async function updateUserSection() {
    const userSection = document.getElementById('user-section');
    if (!userSection) return;
    
    await verify_token();
    username = currentUser["name"]
    userSection.innerHTML = `
        <div class="user-menu">
            <div class="user-avatar">
                ${username.charAt(0).toUpperCase()}
            </div>
            <span class="user-name">${username}</span>
            <button onclick="logout()" class="btn-logout">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    `;
}

window.logout = function() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
};

async function loadDashboard() {
    await verify_token();
    document.getElementById('user-name-display').textContent = currentUser.name;
    
    // Load committee info
    get_committee_news();
    
    // Load tasks
    loadTasks();
    
    // Show admin panel if user is admin
    if (currentUser["isAdmin"]) {
        console.log("admin")
        document.getElementById('admin-panel').classList.add('visible');
        loadAdminPanel();
    }
}
async function get_committee_news() {
    const committee = currentUser["committee"];
    const container = document.getElementById('committee-news');
    
    // Show loading state
    container.innerHTML = '<div class="loading">Loading committee news...</div>';
    
    try {
        const response = await fetch(`${API_URL}/committee-news/${committee}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const news = await response.json();
        
        const committee_name = getCommitteeName(currentUser["committee"]);
        container.innerHTML =`       <div class="committee-icon-large committee-${committee_name}">
            <i class="fas ${getCommitteeIcon(committee_name)}"></i>
        </div>
        <h3>${committee_name.charAt(0).toUpperCase() + committee_name.slice(1)} Committee</h3>` + news.map(n => add_news_card(n)).join('')
        

    } catch (error) {
        console.error("Error loading committee news:", error);
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load committee news. Please try again later.</p>
            </div>
        `;
    }
}

// Helper function to get committee icon
function getCommitteeIcon(committee) {
    const icons = {
        creativity: 'fa-lightbulb',
        pr: 'fa-handshake',
        pm: 'fa-tasks',
        media: 'fa-camera-retro'
    };
    return icons[committee] || 'fa-users';
}

function getCommitteeName(committee) {
    const names=["creativity","PM","PR","Media"];
    return names[committee-1];
}

function add_news_card(news){
    const committee = getCommitteeName(currentUser["committee"]);
    const endDate = new Date(news.end_date);
    const formattedDate = endDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });


    cardHTML = `
        <div class="news-section">
            <h4 class="news-title">
                <i class="fas fa-newspaper"></i>
                Latest News
            </h4>
            <div class="news-card">
                <h5 class="news-headline">${news.title}</h5>
                <p class="news-description">${news.description}</p>
                <div class="news-footer">
                    <span class="news-date">
                        <i class="fas fa-calendar-alt"></i>
                        Ends: ${formattedDate}
                    </span>
                </div>
            </div>
        </div>
    `;
    
    return cardHTML;
}

async function loadTasks() {
    const tasksList = document.getElementById('tasks-list');
    const committee = currentUser["committee"];
    tasks = await fetch(`${API_URL}/tasks/?committee=${committee}`)
    const committeeTasks = await tasks.json();
    
    if (committeeTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="no-tasks">
                <i class="fas fa-check-circle"></i>
                <p>No tasks assigned yet. Great job!</p>
            </div>
        `;
        return;
    }

    const completedResponse = await get_completed_tasks();
    const completed_tasks = completedResponse;

    
    tasksHTML = await Promise.all(committeeTasks.map(task => add_task_card(task,completed_tasks)));
    tasksList.innerHTML = tasksHTML.join('');
    
    // Add event listeners to checkboxes
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const taskId = checkbox.getAttribute('data-id');
            if (taskId) {
                toggleTaskComplete(taskId);
            }
        });
    });
}


function add_task_card(task,completed_tasks) {
    const dueDate = new Date(task.submit_date);
    const today = new Date();
    completed = completed_tasks.includes(parseInt(task["task_id"])) ? 'completed':''
    today.setHours(0, 0, 0, 0);
    const isOverdue = dueDate < today && completed;
    const description = task["description"] || 'No description provided';
    const shortDescription = description.length > 100 ? description.substring(0, 100) + '...' : description;
    
    return `
        <div class="task-item ${isOverdue ? 'overdue' : ''}">
            <div class="task-checkbox ${completed}" data-id="${task["task_id"]}">
                ${completed!=""? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="task-content">
                <div class="task-title ${completed!="" ? 'completed' : ''}">${task.title}</div>
                

                <div class="task-description-container">
                    <p class="task-description ${completed ? 'completed' : ''}">${shortDescription}</p>
                    ${description.length > 100 ? '<button class="read-more-btn" onclick="expandDescription(this)">Read more</button>' : ''}
                </div>

                <div class="task-meta">
                    <span class="task-status ${completed ? 'completed' : 'pending'}">
                        <i class="fas ${completed ? 'fa-check-circle' : 'fa-hourglass-half'}"></i>
                        ${completed ? 'Completed' : 'Pending'}
                    </span>
                </div>
            </div>
        </div>
    `;
}

function expandDescription(btn) {
    const desc = btn.previousElementSibling;
    if (desc.classList.contains('expanded')) {
        desc.classList.remove('expanded');
        btn.textContent = 'Read more';
    } else {
        desc.classList.add('expanded');
        desc.textContent = desc.getAttribute('data-full-text') || desc.textContent;
        btn.textContent = 'Read less';
    }
}

async function toggleTaskComplete(taskId) {
    try {
        const userId = currentUser["id"];
        const apiKey = "1";
        
        console.log(JSON.stringify({
            user_id: parseInt(userId),
            task_id: parseInt(taskId),
            api_key: apiKey
        }))
        // Validate inputs
        if (!taskId) {
            console.error("Task ID is undefined or null");
            showNotification('Invalid task ID', 'error');
            return;
        }
        
        if (!userId) {
            console.error("User ID is null");
            showNotification('User not logged in', 'error');
            return;
        }
        
        if (!apiKey) {
            console.error("API Key is missing");
            showNotification('API key missing', 'error');
            return;
        }
        
        // FIXED: Use the correct endpoint URL with task_id parameter
        const response = await fetch(`${API_URL}/${taskId}/toggle`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: parseInt(userId),
                task_id: parseInt(taskId),
                api_key: apiKey
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Server error:", errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Reload tasks to reflect changes
        await loadTasks();
        
        showNotification('Task status updated!', 'success');
        
    } catch (error) {
        console.error("Error toggling task:", error);
        showNotification('Failed to update task', 'error');
    }
}

function showNotification(message, type = 'success') {
    // You can implement this function
    alert(message); // Temporary alert for testing
}

async function loadAdminPanel() {
    if (!currentUser.isAdmin) return;
    
    const admin_panel = document.getElementById('admin-panel');
    if (admin_panel) {
        admin_panel.style.display = 'block';
        await loadCommitteeTasks();
        await loadCommitteeNews();
        initAdminTabs();
    }
}

async function loadCommitteeTasks() {
    const tasksGrid = document.getElementById('tasks-grid');
    if (!tasksGrid) return;
    
    const committeeId = currentUser.committee;
    
    try {
        tasksGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading tasks...</p>
            </div>
        `;
        
        // Use the same endpoint as users with committee filter
        const response = await fetch(`${API_URL}/tasks/?committee=${committeeId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('AdaptToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch tasks');
        }
        
        const tasks = await response.json();
        
        if (!tasks || tasks.length === 0) {
            tasksGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <p>No tasks found for your committee</p>
                    <button class="admin-add-btn" onclick="showAddTaskModal()" style="margin-top: 16px;">
                        <i class="fas fa-plus-circle"></i> Create Task
                    </button>
                </div>
            `;
            return;
        }
        
        tasksGrid.innerHTML = tasks.map(task => createTaskCard(task)).join('');
        
    } catch (error) {
        console.error("Error loading tasks:", error);
        tasksGrid.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load tasks</p>
            </div>
        `;
    }
}

// Load News for Admin's Committee (same API as users)
async function loadCommitteeNews() {
    const newsGrid = document.getElementById('news-grid');
    if (!newsGrid) return;
    
    const committeeId = currentUser.committee;
    
    try {
        newsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading news...</p>
            </div>
        `;
        
        // Use the same endpoint as users
        const response = await fetch(`${API_URL}/committee-news/${committeeId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('AdaptToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch news');
        }
        
        const news = await response.json();
        
        if (!news || news.length === 0) {
            newsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-newspaper"></i>
                    <p>No news found for your committee</p>
                    <button class="admin-add-btn" onclick="showAddNewsModal()" style="margin-top: 16px;">
                        <i class="fas fa-plus-circle"></i> Add News
                    </button>
                </div>
            `;
            return;
        }
        
        newsGrid.innerHTML = news.map(item => createNewsCard(item)).join('');
        
    } catch (error) {
        console.error("Error loading news:", error);
        newsGrid.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load news</p>
            </div>
        `;
    }
}

// Create Task Card (Admin View)
function createTaskCard(task) {
    const dueDate = new Date(task.submit_date || task.due_date);
    const formattedDate = dueDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    return `
        <div class="admin-item-card" data-task-id="${task.task_id}">
            <div class="admin-item-header">
                <span class="admin-item-id">#${task.task_id}</span>
            </div>
            <h4 class="admin-item-title">${task.title}</h4>
            <p class="admin-item-description">${task.description || 'No description'}</p>
            <div class="admin-item-meta">
                <span><i class="fas fa-calendar"></i> Due: ${formattedDate}</span>
            </div>
            <div class="admin-item-actions">
                <button class="action-btn delete" onclick="deleteTask(${task.task_id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

// Create News Card (Admin View)
function createNewsCard(news) {
    const endDate = new Date(news.end_date);
    const formattedDate = endDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    return `
        <div class="admin-item-card" data-news-id="${news.id}">
            <div class="admin-item-header">
                <span class="admin-item-id">#${news.id}</span>
            </div>
            <h4 class="admin-item-title">${news.title}</h4>
            <p class="admin-item-description">${news.description || 'No description'}</p>
            <div class="admin-item-meta">
                <span><i class="fas fa-calendar-alt"></i> Ends: ${formattedDate}</span>
            </div>
            <div class="admin-item-actions">
                <button class="action-btn delete" onclick="deleteNews(${news.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

// Delete Task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`${API_URL}/remove_task/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('AdaptToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: taskId,
                api_key: "1" // Your API key
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete task');
        }
        
        // Remove card with animation
        const card = document.querySelector(`.admin-item-card[data-task-id="${taskId}"]`);
        if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                card.remove();
                checkEmptyTasks();
            }, 300);
        }
        
        showNotification('Task deleted successfully', 'success');
        
    } catch (error) {
        console.error("Error deleting task:", error);
        showNotification('Failed to delete task', 'error');
    }
}

// Delete News
async function deleteNews(newsId) {
    if (!confirm('Are you sure you want to delete this news item?')) return;
    
    try {
        const response = await fetch(`${API_URL}/remove_news/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('AdaptToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: parseInt(newsId),
                api_key: "1" // Your API key
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete news');
        }
        
        // Remove card with animation
        const card = document.querySelector(`.admin-item-card[data-news-id="${newsId}"]`);
        if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                card.remove();
                checkEmptyNews();
            }, 300);
        }
        
        showNotification('News deleted successfully', 'success');
        
    } catch (error) {
        console.error("Error deleting news:", error);
        showNotification('Failed to delete news', 'error');
    }
}

// Check if tasks grid is empty
function checkEmptyTasks() {
    const tasksGrid = document.getElementById('tasks-grid');
    const committeeName = getCommitteeName(currentUser.committee);
    
    if (tasksGrid && tasksGrid.children.length === 0) {
        tasksGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <p>No tasks found for ${committeeName} committee</p>
                <button class="admin-add-btn" onclick="showAddTaskModal()" style="margin-top: 16px;">
                    <i class="fas fa-plus-circle"></i> Create Task
                </button>
            </div>
        `;
    }
}

// Check if news grid is empty
function checkEmptyNews() {
    const newsGrid = document.getElementById('news-grid');
    const committeeName = getCommitteeName(currentUser.committee);
    
    if (newsGrid && newsGrid.children.length === 0) {
        newsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-newspaper"></i>
                <p>No news found for ${committeeName} committee</p>
                <button class="admin-add-btn" onclick="showAddNewsModal()" style="margin-top: 16px;">
                    <i class="fas fa-plus-circle"></i> Add News
                </button>
            </div>
        `;
    }
}



function initAdminTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const contents = document.querySelectorAll('.admin-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding content
            const tabName = tab.getAttribute('data-tab');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

function showAddTaskModal() {
    document.getElementById('add-task-modal').classList.add('show');
}

function showAddNewsModal() {
    document.getElementById('add-news-modal').classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

document.getElementById('add-task-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        committee: parseInt(document.getElementById('task-committee').value),
        submit_date: document.getElementById('task-due-date').value,
        api_key: document.getElementById('task-api-key').value
    };
    
    try {
        const response = await fetch(`${API_URL}/add_task/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('AdaptToken')}`
            },
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            closeModal('add-task-modal');
            await loadCommitteeTasks();
            showNotification('Task created successfully!', 'success');
        }
    } catch (error) {
        console.error("Error creating task:", error);
        showNotification('Failed to create task', 'error');
    }
});

document.getElementById('add-news-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newsData = {
        title: document.getElementById('news-title').value,
        description: document.getElementById('news-description').value,
        committee: parseInt(document.getElementById('news-committee').value),
        end_date: document.getElementById('news-end-date').value,
        api_key: document.getElementById('news-api-key').value
    };
    console.log(newsData)
    try {
        const response = await fetch(`${API_URL}/add_news/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('AdaptToken')}`
            },
            body: JSON.stringify(newsData)
        });
        
        if (response.ok) {
            closeModal('add-news-modal');
            await loadCommitteeNews();
            showNotification('Task created successfully!', 'success');
        }
    } catch (error) {
        console.error("Error creating task:", error);
        showNotification('Failed to create task', 'error');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    updateUserSection();
    loadDashboard();
});

