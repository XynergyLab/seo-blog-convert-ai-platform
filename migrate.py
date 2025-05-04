#!/usr/bin/env python
"""
Database Migration Script

This script initializes and runs database migrations using Flask-Migrate.
"""
import os
import sys
import click
from flask import Flask
from flask.cli import FlaskGroup
from app import create_app
from app.database import db, migrate
from db_init import init_database

@click.group(cls=FlaskGroup, create_app=create_app)
def cli():
    """Management script for the LM-Studio-Agents application."""
    pass

@cli.command()
def init():
    """Initialize the database with tables and initial configuration"""
    
