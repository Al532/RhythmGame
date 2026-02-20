(function bootstrapNoteSequenceGenerator(globalScope) {
  const DEFAULT_MELODY_CONSTRAINTS = Object.freeze({
    MAX_CONSECUTIVE_LEAP_SEMITONES: 12,
    MAX_B_TO_A_LEAP_SEMITONES: 2,
    MAX_E_TO_AB_LEAP_SEMITONES: 1,
    MAX_SEQUENCE_RANGE_SEMITONES: 14,
    REPETITION_PROBABILITY_FACTOR: 0.25
  });

  function normalizePitchClassSet(values) {
    if (values instanceof Set) return values;
    return new Set(Array.isArray(values) ? values : []);
  }

  function getCategory(midi, primaryPitchClasses, secondaryPitchClasses, forbiddenPitchClasses) {
    const pitchClass = ((midi % 12) + 12) % 12;
    if (primaryPitchClasses.has(pitchClass)) return 'A';
    if (secondaryPitchClasses.has(pitchClass)) return 'B';
    if (forbiddenPitchClasses.has(pitchClass)) return 'C';
    return 'E';
  }

  function buildPlayableNotes(minMidi, maxMidi, primaryPitchClasses, secondaryPitchClasses, forbiddenPitchClasses) {
    const notes = [];
    for (let midi = minMidi; midi <= maxMidi; midi += 1) {
      const category = getCategory(midi, primaryPitchClasses, secondaryPitchClasses, forbiddenPitchClasses);
      if (category === 'C') continue;
      notes.push({ midi, category });
    }
    return notes;
  }

  function buildMemoKey({
    index,
    previousMidi,
    previousCategory,
    previousDirection,
    previousLeap,
    sequenceMin,
    sequenceMax
  }) {
    return [
      index,
      previousMidi,
      previousCategory,
      previousDirection,
      previousLeap,
      sequenceMin,
      sequenceMax
    ].join('|');
  }

  function weightedShuffleWithRepetitionPenalty(candidates, previousMidi, repetitionProbabilityFactor) {
    const scored = candidates.map((candidate) => {
      const repetitionPenalty = candidate.midi === previousMidi ? repetitionProbabilityFactor : 1;
      const score = -Math.log(Math.random()) * (1 / Math.max(repetitionPenalty, 0.0001));
      return { candidate, score };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored.map(({ candidate }) => candidate);
  }

  function isTransitionAllowed({
    previousMidi,
    previousCategory,
    previousDirection,
    previousLeap,
    candidate,
    constraints
  }) {
    if (previousMidi === null) {
      return candidate.category === 'A' || candidate.category === 'B';
    }

    const leap = Math.abs(candidate.midi - previousMidi);
    if (leap > constraints.MAX_CONSECUTIVE_LEAP_SEMITONES) {
      return false;
    }

    if (previousCategory === 'A') {
      if (!['A', 'B', 'E'].includes(candidate.category)) return false;
    } else if (previousCategory === 'B') {
      if (candidate.category === 'B') {
        if (leap !== 0) return false;
      } else if (candidate.category === 'A') {
        if (leap > constraints.MAX_B_TO_A_LEAP_SEMITONES) return false;
      } else {
        return false;
      }
    } else if (previousCategory === 'E') {
      if (!['A', 'B'].includes(candidate.category)) return false;
      if (leap > constraints.MAX_E_TO_AB_LEAP_SEMITONES) return false;
    } else {
      return false;
    }

    const direction = candidate.midi === previousMidi ? 0 : (candidate.midi > previousMidi ? 1 : -1);
    const antiImmediateReturnActive = previousLeap === 1 && previousDirection !== 0;
    const isReversal = direction !== 0 && direction === -previousDirection;
    if (antiImmediateReturnActive && isReversal && (leap === 1 || leap === 2)) {
      return false;
    }

    return true;
  }

  function generateMidiSequence(config) {
    const minMidi = Number(config.minMidi);
    const maxMidi = Number(config.maxMidi);
    const noteCount = Number(config.noteCount);
    const constraints = {
      ...DEFAULT_MELODY_CONSTRAINTS,
      ...(config.constraints || {})
    };

    if (!Number.isInteger(minMidi) || !Number.isInteger(maxMidi) || minMidi < 0 || maxMidi > 127 || minMidi > maxMidi) {
      throw new Error('Impossible de générer une mélodie valide avec ces contraintes.');
    }
    if (!Number.isInteger(noteCount) || noteCount <= 0) {
      throw new Error('Impossible de générer une mélodie valide avec ces contraintes.');
    }

    const primaryPitchClasses = normalizePitchClassSet(config.primaryPitchClasses);
    const secondaryPitchClasses = normalizePitchClassSet(config.secondaryPitchClasses);
    const forbiddenPitchClasses = normalizePitchClassSet(config.forbiddenPitchClasses);

    const playableNotes = buildPlayableNotes(
      minMidi,
      maxMidi,
      primaryPitchClasses,
      secondaryPitchClasses,
      forbiddenPitchClasses
    );

    if (playableNotes.length === 0) {
      throw new Error('Impossible de générer une mélodie valide avec ces contraintes.');
    }

    const memo = new Map();

    function backtrack(index, sequence, state) {
      if (index === noteCount) {
        if (sequence.length === 0) return null;
        const lastCategory = getCategory(
          sequence[sequence.length - 1],
          primaryPitchClasses,
          secondaryPitchClasses,
          forbiddenPitchClasses
        );
        return lastCategory === 'A' ? [...sequence] : null;
      }

      const memoKey = buildMemoKey({
        index,
        previousMidi: state.previousMidi,
        previousCategory: state.previousCategory,
        previousDirection: state.previousDirection,
        previousLeap: state.previousLeap,
        sequenceMin: state.sequenceMin,
        sequenceMax: state.sequenceMax
      });
      if (memo.has(memoKey)) {
        return null;
      }

      const candidates = weightedShuffleWithRepetitionPenalty(
        playableNotes,
        state.previousMidi,
        constraints.REPETITION_PROBABILITY_FACTOR
      );

      for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
        const candidate = candidates[candidateIndex];
        if (!isTransitionAllowed({
          previousMidi: state.previousMidi,
          previousCategory: state.previousCategory,
          previousDirection: state.previousDirection,
          previousLeap: state.previousLeap,
          candidate,
          constraints
        })) {
          continue;
        }

        const nextMin = state.sequenceMin === null ? candidate.midi : Math.min(state.sequenceMin, candidate.midi);
        const nextMax = state.sequenceMax === null ? candidate.midi : Math.max(state.sequenceMax, candidate.midi);
        if ((nextMax - nextMin) > constraints.MAX_SEQUENCE_RANGE_SEMITONES) {
          continue;
        }

        const leap = state.previousMidi === null ? 0 : Math.abs(candidate.midi - state.previousMidi);
        const direction = state.previousMidi === null
          ? 0
          : (candidate.midi === state.previousMidi ? 0 : (candidate.midi > state.previousMidi ? 1 : -1));

        sequence.push(candidate.midi);
        const result = backtrack(index + 1, sequence, {
          previousMidi: candidate.midi,
          previousCategory: candidate.category,
          previousDirection: direction,
          previousLeap: leap,
          sequenceMin: nextMin,
          sequenceMax: nextMax
        });
        if (result) return result;
        sequence.pop();
      }

      memo.set(memoKey, true);
      return null;
    }

    const sequence = backtrack(0, [], {
      previousMidi: null,
      previousCategory: null,
      previousDirection: 0,
      previousLeap: 0,
      sequenceMin: null,
      sequenceMax: null
    });

    if (!sequence) {
      throw new Error('Impossible de générer une mélodie valide avec ces contraintes.');
    }

    return sequence;
  }

  globalScope.NoteSequenceGenerator = {
    DEFAULT_MELODY_CONSTRAINTS,
    generateMidiSequence
  };
}(window));
