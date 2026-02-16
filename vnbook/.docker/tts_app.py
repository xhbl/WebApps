from flask import Flask, request, send_file
import edge_tts
import asyncio
import os

app = Flask(__name__)

@app.route('/tts')
def tts():
    text = request.args.get('text')
    # Aria 是美式英语女声，Guy 是美式英语男声
    voice = request.args.get('voice', 'en-US-AriaNeural')
    output_file = "temp_voice.mp3"
    
    async def generate():
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_file)

    try:
        asyncio.run(generate())
        return send_file(output_file, mimetype="audio/mpeg")
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    # 容器内固定监听 5050
    app.run(host='0.0.0.0', port=3343)