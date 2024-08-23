from flask import Flask, render_template, make_response
import requests
from functools import wraps, update_wrapper
from datetime import datetime

app = Flask(__name__,
            static_url_path='/resources',
            static_folder='resources',
            template_folder='pages')


def nocache(view):
    @wraps(view)
    def no_cache(*args, **kwargs):
        response = make_response(view(*args, **kwargs))
        response.headers['Last-Modified'] = datetime.now()
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        return response

    return update_wrapper(no_cache, view)


@nocache
@app.route('/')
def home():
    return render_template("index.html")


@app.route('/teapot')
def iamateapot():
    return "<img src=\"https://raw.githubusercontent.com/hiroharu-kato/neural_renderer/master/examples/data/example1.gif\">", 418
