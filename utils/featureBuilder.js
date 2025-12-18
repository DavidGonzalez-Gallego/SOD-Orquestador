// orquestador/utils/featureBuilder.js
function buildFeatures(historicalData, date = new Date()) {

  const jsDay = date.getDay();
  const dia_semana = (jsDay + 6) % 7;

  return [
    historicalData.consumo_t,
    historicalData.consumo_t_1,
    historicalData.consumo_t_2,
    date.getHours(),
    dia_semana,
    date.getMonth() + 1,
    date.getDate()
  ];
}

module.exports = { buildFeatures };
