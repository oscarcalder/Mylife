import { BODY_OPTIONS, NICOTINE_IDS } from "../data/catalogs.js";
import { INTERVENTIONS } from "../data/interventions.js";
import { QUESTION_BANK } from "../data/questionBank.js";
import { avgIntervalBetween, firstNicotineMinAfterWake, substanceEvents } from "./calculations.js";
import { buildCarta3, buildCartaDiaria } from "./cartas.js";
import { coachHomeLine, coachLayers, recordStyleAnswer, shouldAskStyle, styleLayers, styleOf } from "./coach.js";
import { APP_VERSION, SCHEMA_VERSION } from "./config.js";
import { DETECTORS, EXPERIMENT_TEMPLATES, acceptExperiment, applyExperimentOutcome, bestToolOf, breakdownFrom, calcConfidence, detectedMechanisms, directorOnEvent, ensureStat, evaluateOpenExperiments, measureMetric, pickInterventionFor, promoteLaws, recalcAllHypotheses, recordInterventionFeedback, resolveExperiment, statusFor, trendOfHypothesis } from "./director.js";
import { addEvent, deleteEvent, patchEventContext } from "./events.js";
import { buildInsights, buildVictories, markInsightShown, priorityOf } from "./insightsEngine.js";
import { compositeSnapshot, latentSnapshot, updateLatentOnEvent } from "./latentVars.js";
import { closedDays, getOpenDay } from "./logicalDay.js";
import { markAnswered, markShown, markSkipped, mostSkippedVariable, selectQuestions, storeQuestionSetHash } from "./questionSelector.js";
import { assocOfMetrics, buildRelationGraph, pearson, trendOfMetric } from "./relationsAndTrends.js";
import { buildSnapshot, computeDayStats, dayStats, rebuildDerived, regenerateSnapshotStats, snapshotOfDay, verifyDerived } from "./snapshots.js";
import { defaultState, deleteBackupKey, listBackups, migrateState, pruneBackups, readBackupRaw, readMeta, saveBackupRotating, saveRawBackup } from "./storage.js";
import { cloneState } from "../ui/helpers.js";
import { nowISO, uid } from "../utils/time.js";
import { selectInterventionRoute, routeFromDiscriminator, ROUTES, SOS_DISCRIMINATOR,
  SOS_SECOND, GOOD_FOLLOWUPS, startIntervention, concludeIntervention, closeIntervention,
  learnTool, pickToolFor, markToolShown, toolStatsOf } from "./clinicalRouter.js";
import { BATTLES, computeBattle } from "./battles.js";
import { inferMicrostate, buildMicrovictory, dayVectors, checkFocus, setFocusTomorrow,
  FOCUS_OPTIONS } from "./microstates.js";
import { FORBIDDEN, violatesLanguage, epistemicBlock } from "./language.js";
import { moodBalance, moodComparison, moodEmotions, moodDayparts, DAYPARTS } from "./moodStats.js";
import { nicotineDetail, alcoholDetail, motaDetail } from "./substanceStats.js";
import { editEvent, editedEventsCount } from "./events.js";
import { brainStatus, DETECTOR_KEYS } from "./brainStatus.js";
import { nicotineRecords, toleranceRecords } from "./substanceStats.js";
export const ENGINE = { APP_VERSION, SCHEMA_VERSION,
  defaultState, migrateState, cloneState, uid, nowISO,
  getOpenDay, addEvent, patchEventContext, deleteEvent, closedDays,
  substanceEvents, avgIntervalBetween, firstNicotineMinAfterWake,
  calcConfidence, statusFor, DETECTORS, recalcAllHypotheses, directorOnEvent,
  updateLatentOnEvent, latentSnapshot, detectedMechanisms,
  acceptExperiment, resolveExperiment, ensureStat,
  recordInterventionFeedback, pickInterventionFor, bestToolOf,
  selectQuestions, markShown, markAnswered, markSkipped,
  storeQuestionSetHash, mostSkippedVariable,
  buildInsights, buildVictories, markInsightShown,
  coachHomeLine, coachLayers, buildCartaDiaria, buildCarta3,
  QUESTION_BANK, INTERVENTIONS, NICOTINE_IDS,
  computeDayStats, dayStats, rebuildDerived, verifyDerived,
  buildSnapshot, snapshotOfDay, regenerateSnapshotStats,
  breakdownFrom, trendOfHypothesis, priorityOf,
  EXPERIMENT_TEMPLATES, measureMetric, evaluateOpenExperiments,
  applyExperimentOutcome, promoteLaws, compositeSnapshot,
  styleOf, styleLayers, shouldAskStyle, recordStyleAnswer,
  buildRelationGraph, trendOfMetric, assocOfMetrics, pearson,
  saveRawBackup, saveBackupRotating, listBackups, pruneBackups, readBackupRaw,
  deleteBackupKey, readMeta, BODY_OPTIONS,
  selectInterventionRoute, routeFromDiscriminator, ROUTES, SOS_DISCRIMINATOR, SOS_SECOND,
  GOOD_FOLLOWUPS, startIntervention, concludeIntervention, closeIntervention,
  learnTool, pickToolFor, markToolShown, toolStatsOf,
  BATTLES, computeBattle, inferMicrostate, buildMicrovictory, dayVectors, checkFocus,
  setFocusTomorrow, FOCUS_OPTIONS, FORBIDDEN, violatesLanguage, epistemicBlock,
  moodBalance, moodComparison, moodEmotions, moodDayparts, DAYPARTS,
  brainStatus, DETECTOR_KEYS, nicotineRecords, toleranceRecords,
  nicotineDetail, alcoholDetail, motaDetail, editEvent, editedEventsCount,
};
