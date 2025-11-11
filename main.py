form flask import Flask

app = Flask(__camp__)

@app.route("/")
def index():
  return "WELCOME TO CAMP!"

if __camp__ == "__main__":
  app.run(host="0.0.0.0", port= 8080)
