// orquestador/server.js
require("dotenv").config();
const express = require("express");
const { buildFeatures } = require("./utils/featureBuilder");

const app = express();
const PORT = process.env.PORT || 8080;

const ACQUIRE_URL = process.env.ACQUIRE_URL;
const PREDICT_URL = process.env.PREDICT_URL;

if (!ACQUIRE_URL || !PREDICT_URL) {
    console.error("[ORCHESTRATOR] Error con las URLs de los mircroservicios");
    process.exit(1);
}

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "orchestrator" });
});

app.get("/run-prediction", async (req, res) => {
  let statusCode = 500;
  try {
    console.log(`[ORCHESTRATOR] Llamando a Acquire`);
    const resAcquire = await fetch(`${ACQUIRE_URL}/last-days`);
    
    if (!resAcquire.ok) {
        throw new Error(`Fallo Acquire. Estado: ${resAcquire.status}`);
    }
    const historicalData = await resAcquire.json();

    const featuresArray = buildFeatures(historicalData);
    console.log("[ORCHESTRATOR] 'Features' que se pasarán a Predict:", featuresArray);

    console.log(`[ORCHESTRATOR] Llamando a Predict`);
    const resPredict = await fetch(`${PREDICT_URL}/predict`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ features: featuresArray })
    });
    
    if (!resPredict.ok) {
        throw new Error(`Fallo Predict. Estado: ${resPredict.status}`);
    }

    const resPredictJson = await resPredict.json();
    const predictionValue = resPredictJson.prediction;

    const finalResponse = {
        status: "OK",
        description: "Predicción de consumo de energía.",

        prediction_kwh: parseFloat(predictionValue.toFixed(4)), 
        
        auditoria: {
            features_usadas: {
                consumo_t_1: featuresArray[0],
                consumo_t_2: featuresArray[1],
                consumo_t_3: featuresArray[2],
                hora: featuresArray[3],
                dia_semana: featuresArray[4],
                mes: featuresArray[5],
                dia_mes: featuresArray[6]
            },
            predict_id: resPredictJson.predictionId,
            timestamp_orquestador: new Date().toISOString(),
            latencia_ms: resPredictJson.latencyMs
        }
    };

    res.status(200).send(JSON.stringify(finalResponse, null, 2));

  } catch (err) {
    console.log("[ORCHESTRATOR] Error en el flujo:", err.message);
    statusCode = err.response?.status || 502;
    res.status(statusCode).json({ 
        error: "ORCHESTRATION_FAILED", 
        detail: err.message,
        externalServiceResponse: err.response?.data || null 
    });
  }
});

app.listen(PORT, () => {
  console.log(`[ORCHESTRATOR] Escuchando en ${PORT}`);
});
