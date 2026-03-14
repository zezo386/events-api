from fastapi import FastAPI,Query,HTTPException, Depends, Header
from typing import Optional
from pydantic import BaseModel
import sqlite3
import json
from datetime import datetime, timedelta
import secrets
from fastapi.middleware.cors import CORSMiddleware
import ast
import jwt

conn = sqlite3.connect('events.db')
cursor = conn.cursor()

JWT_SECRET_KEY="8f7d9a8f7e9d8f7a9s8df7a9s8df7a9s8df7a9s8df7a9s8df7a9s8df7a9s8df7a9s8d"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

events_db = []

cursor.execute('SELECT * FROM events')
events_db = cursor.fetchall()
cursor.execute("DELETE FROM events WHERE date < ?",(datetime.now().date().strftime('%Y-%m-%d'), ))

conn.commit()

conn.close()



def verify_api_key(api_key):
    
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    
    # First, check and reset daily counters if needed
    cursor.execute('''
        SELECT id, daily_limit, requests_today, last_reset_date, name 
        FROM api_keys 
        WHERE key = ? AND is_active = 1
    ''', (api_key,))
    
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    
    key_id, daily_limit, requests_today, last_reset_date, key_name = row
    
    # Check if we need to reset the daily counter (new day)
    today = datetime.now().date()
    last_reset = datetime.strptime(last_reset_date, '%Y-%m-%d').date()
    
    if today > last_reset:
        # Reset counter for new day
        cursor.execute('''
            UPDATE api_keys 
            SET requests_today = 0, last_reset_date = ? 
            WHERE id = ?
        ''', (today, key_id))
        requests_today = 0
    
    # Check if key has exceeded daily limit
    if requests_today >= daily_limit:
        conn.close()
        raise HTTPException(
            status_code=429,  # Too Many Requests
            detail=f"Daily API limit of {daily_limit} requests exceeded. Please try again tomorrow."
        )
    
    # Increment the request counter
    cursor.execute('''
        UPDATE api_keys 
        SET requests_today = requests_today + 1,
            last_used = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (key_id,))
    
    conn.commit()
    conn.close()
    
    return True , key_id, key_name

class add_event(BaseModel):
    country: str
    city: str
    tags: list[str]
    date: str
    title: str
    description: str
    api_key: str

@app.get("/events")
async def root(id: Optional[int] = None, country: Optional[str] = None, city: Optional[str] = None, tags: Optional[list] = Query(None, description="Filter by tags"), date: Optional[str] = None):
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE date < ?",(datetime.now().date().strftime('%Y-%m-%d'), ))
    cursor.execute('SELECT * FROM events')
    events_db = cursor.fetchall()
    avalible_events = events_db
    

    if id:
        for event in avalible_events:
            if int(event[0]) == id:
                return event
    if country:
        e = [event for event in avalible_events if event[1].lower() == country.lower()]
        avalible_events = e
    if city:
        e = [event for event in avalible_events if event[2].lower() == city.lower()]
        avalible_events = e
    if tags:
        temp = []
        for event in avalible_events:
            p = True
            for tag in tags:
                if tag not in event[4]:
                    p = False
            if p:
                temp.append(event)
                
        avalible_events = temp
    
    if date:
        temp = [event for event in avalible_events if event[3]>date]
        avalible_events = temp

    conn.close()
    return avalible_events


@app.post("/add_event/")
def add(
    event: add_event, 
):

    
    is_valid, key_id, key_name = verify_api_key(event.api_key)
    
    if not is_valid:
        raise HTTPException(
            status_code=401, 
            detail="Invalid or inactive API key"
        )
    

    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    
    try:
        # Insert the event
        cursor.execute('''
        INSERT INTO events (country, city, date, tags, title, description)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (event.country, event.city, event.date, str(event.tags), event.title, event.description))
        
        # Get the auto-generated ID
        event_id = cursor.lastrowid
        
        # Commit the changes
        conn.commit()
        
        return {
            "message": "Event added successfully",
            "event_id": event_id,
            "used_by": key_name 
        }
    except Exception as e:
        conn.rollback()
        print(str(e))
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()




@app.delete("/delete_event/{event_id}")
def delete_event(
    event_id: int,
    api_key: str
):
    is_valid, key_id, key_name = verify_api_key(api_key)
    
    if not is_valid:
        raise HTTPException(
            status_code=401, 
            detail="Invalid or inactive API key"
        )
    
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id FROM events WHERE id = ?", (event_id,))
        event = cursor.fetchone()
        
        if not event:
            raise HTTPException(
                status_code=404, 
                detail=f"Event with id {event_id} not found"
            )
        
        # Delete the event
        cursor.execute("DELETE FROM events WHERE id = ?", (event_id,))
        
        conn.commit()
        
        return {
            "message": f"Event {event_id} deleted successfully",
            "deleted_by": key_name,
            "event_id": event_id
        }
    except Exception as e:
        conn.rollback()
        print(str(e))
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()


def verify_api_key(api_key):
    
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()
    
    # First, check and reset daily counters if needed
    cursor.execute('''
        SELECT id, name 
        FROM api_keys 
        WHERE key = ? AND is_active = 1
    ''', (api_key,))
    
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    
    key_id, key_name = row
    
    conn.commit()
    conn.close()
    
    return True , key_id, key_name

def create_token(username):
    try:
        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()
        cursor.execute("SELECT id,is_admin,committee_id FROM users WHERE username = ?",(username,))
        row = cursor.fetchone()
        
        data = {
            "sub":username,
            "user_id":row[0],
            "role" :"admin" if row[1] else "user",
            "committee":row[2],
            "iat": datetime.utcnow(),            
            "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES) 
        }

        token = jwt.encode(data,JWT_SECRET_KEY,algorithm=ALGORITHM)

        return token
    except Exception as e:
        raise HTTPException(501,e)
    finally:
        conn.close()

def decode_token(token):
    try:
        return jwt.decode(token,JWT_SECRET_KEY,algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401,"token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401,"invalid token")

class add_user_model(BaseModel):
    username: str
    password: str
    email: str
    committee: int
    api_key: str

class toggle_task_model(BaseModel):
    user_id: int
    task_id: int
    api_key: str

class add_task_model(BaseModel):
    title: str
    description: str
    submit_date: str
    committee: int
    api_key: str

class add_news_model(BaseModel):
    title: str
    description: str
    end_date: str
    committee: int
    api_key: str

class remove_news_model(BaseModel):
    id: int
    api_key: str

class remove_task_model(BaseModel):
    id: int
    api_key: str

@app.get("/login/")
def user(username: str, password: str):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    for user in users:
        if user[1] == username:
            if user[2] == password:
                return {
                    "logged in":True,
                    "user_id":user[0],
                    "username":user[1],
                    "committee":user[4],
                    "token":create_token(username),
                    }
            else:
                return {"logged in":False,
                        "message":"Wrong password"
                        }
    return {"logged in":False,
            "message":"username not found"
            }

@app.post("/register/")
def register(user: add_user_model):
    
    is_valid, key_id, key_name = verify_api_key(user.api_key)

    if not is_valid:
        raise HTTPException(status_code=401,detail="unauthorized")
    try:
        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?",(user.username,))
        if cursor.fetchone():
            return {
                "authorized":False,
                "message":"username already taken"
            }
        cursor.execute("INSERT INTO users (username, password, email, committee) VALUES (?, ?, ?, ?)",(user.username,user.password,user.email,user.committee))
        conn.commit()
        return {
            "authorized":True,
            "message":"Signed up succesfully",
            "added by":key_name
        }
    except Exception as e:
        conn.rollback()
        print(str(e))
        raise HTTPException(status_code=500,detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.get("/verify_token/{token}")
def verify_token(token: str):
    return decode_token(token)

@app.get("/tasks/")
def get_task(committee: Optional[int] = None, task_id: Optional[int] = None):
    try:
        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()
        cursor.execute("SELECT task_id,task_title,taks_description,committee_id,submit_date FROM tasks")

        tasks = cursor.fetchall()
    except Exception as e:
        print(str(e))
        raise HTTPException(500,f"Database error: {str(e)}")
    finally:
        conn.close()
    result = []
    for task in tasks:
        result.append(
            {
                "task_id":int(task[0]),
                "title":task[1],
                "description":task[2],
                "committee":task[3],
                "submit_date":task[4]
            }
        )

    if task_id:
        return [task for task in result if task["task id"] == task_id][0]

    if committee:
        result = [task for task in result if task["committee"]==committee]
    return result

@app.get("/task_status/{userid}")
def task_status(userid):
    try:
        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tasks_complete WHERE user_id = ?",(userid,))
        result = cursor.fetchone()
    except Exception as e:
        print(str(e))
        raise HTTPException(500,f"Database error: {str(e)}")
    finally:
        conn.close()
    
    
    
    return {
        "completed_tasks":result[1] if result else []
    }

@app.patch("/{task_id}/toggle")
def toggle_task(model: toggle_task_model):
    is_valid, key_id, key_name = verify_api_key(model.api_key)

    if not is_valid:
        raise HTTPException(status_code=401,detail="unauthorized")
    try:
        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()
        cursor.execute("SELECT tasks_completed FROM tasks_complete WHERE user_id = ?",(model.user_id,))
        fetched = cursor.fetchone()
        if fetched:
            tasks_completed = ast.literal_eval(fetched[0])
            if model.task_id in tasks_completed:
                tasks_completed.remove(model.task_id)
            else:
                tasks_completed.append(model.task_id)
            cursor.execute("UPDATE tasks_complete SET tasks_completed = ? WHERE user_id = ?",(str(tasks_completed), model.user_id))
        else:
            cursor.execute("INSERT INTO tasks_complete (user_id, tasks_completed) VALUES (?, ?)",(model.user_id, str([model.task_id])))
        conn.commit()
        return {
            "authorized":True,
            "message":f"user {model.user_id} finished task #{model.task_id}",
            "added by":key_name
        }
    except Exception as e:
        conn.rollback()
        print(str(e))
        raise HTTPException(status_code=500,detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.post("/add_task/")
def add_task(task: add_task_model):
    is_valid, key_id, key_name = verify_api_key(task.api_key)

    if not is_valid:
        raise HTTPException(status_code=401,detail="unauthorized")
    try:
        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()
        cursor.execute("INSERT INTO tasks (task_title,taks_description,submit_date,committee_id) VALUES (?, ?, ?, ?)",(task.title,task.description,task.submit_date,task.committee))
        conn.commit()
        return {
            "message":f"added task: {task.title}",
            "added by":key_name
        }
    except Exception as e:
        conn.rollback()
        print(str(e))
        raise HTTPException(status_code=500,detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.delete("/remove_task/")
def remove_task(task: remove_task_model):
    is_valid, key_id, key_name = verify_api_key(task.api_key)

    if not is_valid:
        raise HTTPException(status_code=401,detail="unauthorized")
    try:
        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tasks WHERE task_id = ?",(task.id,))
        conn.commit()
        return {
            "message":f"deleted task: #{task.id}",
            "added by":key_name
        }
    except Exception as e:
        conn.rollback()
        print(str(e))
        raise HTTPException(status_code=500,detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.get("/committee-news/{committee}")
def get_committee_news(committee: int):
    try:
        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()
        cursor.execute("DELETE FROM news WHERE end_date < ?",(datetime.now().date().strftime('%Y-%m-%d'),))
        cursor.execute("SELECT title,description,end_date,id FROM news WHERE committee_id = ?",(committee,))
        news = cursor.fetchall()
        result = []
        for new in news:
            print(new)
            result.append({
                "title":new[0],
                "description":new[1],
                "end_date":new[2],
                "id":new[3]
            })
        return result
    except Exception as e:
        print(str(e))
        raise HTTPException(500,f"Database error: {str(e)}")
    finally:
        conn.close()

@app.post("/add_news/")
def add_news(news: add_news_model):
    is_valid, key_id, key_name = verify_api_key(news.api_key)

    if not is_valid:
        raise HTTPException(status_code=401,detail="unauthorized")
    try:
        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()
        cursor.execute("INSERT INTO news (title, description,end_date,committee_id) VALUES (?, ?, ?, ?)",(news.title,news.description,news.end_date,news.committee))
        print("inserted new news titled ",news.title)
        conn.commit()
        return {
            "message":f"added news: {news.title}",
            "added by":key_name
        }
    except Exception as e:
        conn.rollback()
        print(str(e))
        raise HTTPException(status_code=500,detail=f"Database error: {str(e)}")
    finally:
        conn.close()
    
@app.delete("/remove_news/")
def remove_news(news: remove_news_model):
    is_valid, key_id, key_name = verify_api_key(news.api_key)

    if not is_valid:
        raise HTTPException(status_code=401,detail="unauthorized")
    try:
        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()
        cursor.execute("DELETE FROM news WHERE id = ?",(news.id,))
        print("deleted ",news.id)
        conn.commit()
        return {
            "message":f"deleted news: #{news.id}",
            "added by":key_name
        }
    except Exception as e:
        conn.rollback()
        print(str(e))
        raise HTTPException(status_code=500,detail=f"Database error: {str(e)}")
    finally:
        conn.close()
    