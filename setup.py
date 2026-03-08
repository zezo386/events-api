import sqlite3
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Header
from typing import Optional
from pydantic import BaseModel
import secrets

def init_db():
    conn = sqlite3.connect('events.db')
    cursor = conn.cursor()

    # NEW: API Keys table with usage limits
    """"
    cursor.execute('''
            INSERT INTO api_keys (key, name, daily_limit)
            VALUES (?, ?, ?)
        ''', ('1', 'debuging key', 1))"""
    cursor.execute("DELETE FROM events")
    conn.commit()
    conn.close()

# Call this when your app starts
init_db()