import os
from flask import Flask, render_template, make_response, jsonify, request
import json
from functools import wraps, update_wrapper
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
print("Initialize Flask app...")
app = Flask(__name__,
            static_url_path='/resources',
            static_folder='resources',
            template_folder='pages')
print("Flask app ready!")
print("Initialize Firebase database...")
cr_str = os.environ.get(
    ("FIREBASE_SERVICE_ACCOUNT_CREDENTIAL"))
creds_dict = json.loads(cr_str)
cred = credentials.Certificate(creds_dict)
firebase_app = firebase_admin.initialize_app(cred)
db = firestore.client()
print("Firebase database ready!")


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
    return render_template("landing_page.html")


@nocache
@app.route('/app')
def render_app():
    return render_template("index.html")


@app.route('/data')
def data():
    allplaces = db.collection("places").stream()
    data = []
    for place in allplaces:
        place_dict = place.to_dict()
        lat = place_dict["position"].latitude
        long = place_dict["position"].longitude

        data.append({
            "type": "Feature",
            "properties": {
                "priority": float(place_dict["priority"]),
                "title": place_dict["name"],
                "description": place_dict["description"],
                "datetime": datetime.strftime(place_dict["datetime"], "%I:%M %p on %d/%m/%Y")
            },
            "geometry": {
                "type": "Point",
                "coordinates": [long, lat]
            }
        })
    output = {
        "type": "FeatureCollection",
        "features": data
    }
    return json.dumps(output, indent=4)


@app.route('/submit', methods=["POST"])
def submitEvent():
    incoming = json.loads(request.data.decode())
    latitude = incoming["position"][1]
    longitude = incoming["position"][0]
    db.collection("places").add({
        "datetime": datetime.now(tz=timezone.utc),
        "description": incoming["description"],
        "name": incoming["title"],
        "position": firestore.firestore.GeoPoint(latitude, longitude),
        "priority": incoming["priority"]
    })
    return "Item was submitted successfully.", 200


@app.route('/teapot')
def iamateapot():
    return "<img src=\"https://raw.githubusercontent.com/hiroharu-kato/neural_renderer/master/examples/data/example1.gif\">", 418
