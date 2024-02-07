import os

import requests
from environs import Env
from flask import Flask, jsonify, request
from playsound import playsound

app = Flask(__name__)
env = Env()
env.read_env()
sent_notifications = []


def play_sound():
    ringtone_filename = "assets/offense.mp3"
    ringtone_file_path = os.path.join(os.path.dirname(__file__), ringtone_filename)
    playsound(ringtone_file_path)


# Function to send a message to the specified group
def send_to_telegram(data):
    # Replace 'YOUR_BOT_TOKEN' with your actual bot token
    bot_token = env.str("BOT_TOKEN")
    # Define the group chat ID where you want to send messages
    group_chat_id = env.int("CHAT_ID")
    # Telegram API URL
    telegram_api_url = f"https://api.telegram.org/bot{bot_token}"

    # Send a notification to the specified group chat
    message_text = (
        f"New Alarm on QRadar\n"
        f"\n"
        f"==Description==\n"
        f"{data['offenseDescription']}\n"
        f"==Date==\n"
        f"{data['offenseDatetime']}\n"
    )
    send_message_url = f"{telegram_api_url}/sendMessage"
    params = {
        "chat_id": group_chat_id,
        "text": message_text,
    }

    response = requests.post(send_message_url, params=params)
    response = response.json()

    if not response["ok"]:
        print("[!] Failed to send to Telegram")
        return False
    return True


@app.route("/notify", methods=["POST"])
def notify():
    try:
        content_type = request.headers.get("Content-Type")
        if content_type == "application/json":
            data = request.get_json()
            offense_timestamp = data["offenseTimestamp"]
            if offense_timestamp in sent_notifications:
                return jsonify({"message": "Offense has already been notified before"})
            play_sound()
            if send_to_telegram(data):
                sent_notifications.append(offense_timestamp)
            return jsonify({"message": "Offense notified"})
        else:
            return jsonify({"error": "Invalid payload"})

    except Exception as e:
        return jsonify({"error": str(e)})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
