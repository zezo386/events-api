const API_URL = 'https://events-api-production-4a05.up.railway.app';

async function Login(){
    try{
        hideMessage();
        username = document.getElementById("log-username").value;
        
        if (! username){
            show_msg("Please fill the username","error");
            return null;
        }

        password = document.getElementById("log-password").value;

        if (! password){
            show_msg("Please fill the password","error");
            return null;
        }

        response = await fetch(`${API_URL}/login/?username=${username}&password=${password}`);
        if (! response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        res = await response.json();
        console.log(res)
        if (res["logged in"] == true){
            localStorage.setItem("AdaptToken",res["token"]);
            window.location.replace("./dashboard.html");
        }
        else{
            show_msg(res["message"],"error");
            return null;
        }
    }
    catch (error) {
        show_msg("Server Error, Please try again later","error");
        return null;
    }
}

async function Register(){
    hideMessage();

    username = document.getElementById("reg-username").value;
    if (! username){
        show_msg("Please fill the username","error");
        return null;
    }
    if (username.includes(' ') || username.includes('\t') || username.includes('\n')){
        show_msg("Username should not contain spaces","error");
        return null;
    }
    if (username.length < 8){
        show_msg("Username must be atleast 8 characters","error");
        return null;
    }

    email = document.getElementById("reg-email").value;
    if (!email){
        show_msg("Please fill the email","error");
        return null;
    }
    if (email.includes(" ") || email.includes("\t") || email.includes("\n")){
        show_msg("Email should not contain spaces","error");
        return null;
    }
    

    password = document.getElementById("reg-password").value;
    if (!password){
        show_msg("Please fill the password","error");
        return null;
    }
    if (password.includes(" ") || password.includes("\t") || password.includes("\n")){
        show_msg("Password should not contain spaces","error");
        return null;
    }
    if (password.length < 8){
        show_msg("Password must be atleast 8 characters","error");
        return null;
    }

    repassword = document.getElementById("reg-repassword").value;
    if (! repassword){
        show_msg("Please confirm the password","error");
        return null;
    }
    if (password != repassword){
        show_msg("Passwords do not match","error");
        return null;
    }

    committee = document.getElementById("reg-committee").value;
    if (!committee){
        show_msg("Please select a committee","error");
        return null;
    }

    try{
        response = await fetch(`${API_URL}/register`,{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
                committee:committee,
                api_key:"1"
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Registration failed');
        }
        show_msg("You signed up succesfully \n You will be redirected to Login","success");
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 5000);
    }
    catch (error){
        show_msg("Server Error, Please try again later","error");
        return { success: false, error: error.message };
    }
}

function show_msg(details, type='info'){
    box=document.getElementById("msg");
    box.textContent = details;
    box.className = `msg show ${type}`;
}

function hideMessage() {
    const box = document.getElementById('msg');
    if (box) {
        box.className = 'msg';
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

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
});




