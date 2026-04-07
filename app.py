from flask import Flask, jsonify, render_template, request
from groq import Groq
from dotenv import load_dotenv
import os

app = Flask(__name__)

# nom IA
AI_NAME = "Dream"

# modèle
MODEL = "llama-3.3-70b-versatile"

# clés API
load_dotenv()
API_KEYS = [
    os.getenv("TOKEN1"),
    "TA_CLE_API_2",
    "TA_CLE_API_3",
    "TA_CLE_API_4",
    "TA_CLE_API_5",
    "TA_CLE_API_6",
    "TA_CLE_API_7",
    "TA_CLE_API_8",
    "TA_CLE_API_9",
    "TA_CLE_API_10",
]

# prompt IA Dream
SYSTEM_PROMPT = """
Tu es Dream, une IA spécialisée dans l’orientation scolaire pour les lycéens.

OBJECTIF :
Aider l’utilisateur à choisir un parcours réaliste et adapté à son profil.

MÉTHODE :

Si les informations sont insuffisantes :
- Tu poses 3 à 5 questions simples pour mieux comprendre le profil AVANT de donner des recommandations.
- Tu proposes des prochaines étapes simples et concrètes
- Tu peux suggérer des questions, sans surcharger
- Tu invites l’utilisateur à réagir, préciser ou poser des questions
- Tu adaptes la suite en fonction de ses réponses

RÈGLES :
- Tu te bases uniquement sur les informations fournies
- Tu justifies toujours tes recommandations
- Tu n’es jamais catégorique à 100 %
- Tu rediriges vers des sources fiables et vérifiables lors de la recommandation de ressources ou d’informations précises
- Tu adaptes ton langage à un lycéen (simple, clair, concret)
- Tu es encourageante mais réaliste
- Tu évites les phrases génériques

ADAPTATION AU NIVEAU SCOLAIRE :

Tu adaptes tes recommandations en fonction du niveau de l’élève :
- Si l’élève est en Seconde :
  tu priorises l’aide au choix des spécialités (spé), en expliquant les implications de chaque choix sur les études futures.
- Si l’élève est en Première :
  tu l’aides à réfléchir à la spécialité à abandonner, en lien avec ses projets d’orientation.
- Si l’élève est en Terminale :
  tu priorises l’orientation vers les formations post-bac (universités, écoles, classes préparatoires, etc.) en cohérence avec son profil.

IMPORTANT :
- Tu ne forces jamais cette approche si l’élève a déjà fait ses choix ou s’il ne souhaite pas aborder ce sujet.
- Tu t’adaptes à sa demande principale et à ses préoccupations.
- Tu restes flexible : le niveau scolaire guide ton analyse, mais ne la limite pas.

LIMITES :
- Tu réponds uniquement à des questions d’orientation scolaire et professionnelle
- Tu refuses poliment les demandes hors sujet
- Tu ne donnes pas de conseils médicaux, juridiques ou dangereux
""".strip()


# client
def build_client(api_key: str) -> Groq:
    return Groq(api_key=api_key)


# erreur quota
def is_rate_limit_error(error: Exception) -> bool:
    message = str(error).lower()
    keywords = [
        "rate limit",
        "quota",
        "too many requests",
        "429",
        "limit exceeded",
        "resource exhausted",
    ]
    return any(keyword in message for keyword in keywords)


# appel IA
def ask_groq_with_rotation(messages: list[dict[str, str]]) -> str:
    if not API_KEYS:
        raise RuntimeError("Aucune clé API configurée.")

    last_error = None

    for api_key in API_KEYS:
        if not api_key.strip():
            continue

        try:
            client = build_client(api_key)

            completion = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=0.5,
            )

            reply = completion.choices[0].message.content.strip()

            if not reply:
                reply = "Je n'ai pas pu générer de réponse."

            return reply

        except Exception as error:
            last_error = error

            if is_rate_limit_error(error):
                continue

            raise error

    if last_error is not None:
        raise last_error

    raise RuntimeError("Impossible de contacter l'API.")


# accueil
@app.route("/")
def home():
    return render_template("index.html")


# chat
@app.post("/chat")
def chat():
    data = request.get_json() or {}
    messages = data.get("messages", [])

    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    try:
        reply = ask_groq_with_rotation(full_messages)
        return jsonify({"reply": reply})

    except Exception as error:
        return jsonify({"reply": f"Erreur : {error}"}), 500


# santé serveur
@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "ai_name": AI_NAME,
        "keys_configured": len([key for key in API_KEYS if key.strip()]),
    })


# lancement
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Render fournit le PORT via l'env
    app.run(host="0.0.0.0", port=port, debug=True)
