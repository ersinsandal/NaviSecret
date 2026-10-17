pragma circom 2.1.0;

/**
 * ZeroProof Proximity Verification Circuit
 * Part of NaviSecret Privacy Engine
 * Author & Owner: Ersin Sandal (SliferSoft)
 *
 * Verifies that a user is within a specified radius of a secret target coordinate
 * without revealing the user's actual location coordinates.
 */

template Num2BitsBounded(n) {
    signal input in;
    signal output out[n];

    var bitSum = 0;
    var bitIdx;
    for (bitIdx = 0; bitIdx < n; bitIdx++) {
        out[bitIdx] <-- (in >> bitIdx) & 1;
        out[bitIdx] * (out[bitIdx] - 1) === 0;
        bitSum += out[bitIdx] * (1 << bitIdx);
    }
    bitSum === in;
}

template LessThan(n) {
    signal input in[2];
    signal output out;

    component bits = Num2BitsBounded(n + 1);
    bits.in <== in[0] + (1 << n) - in[1];
    out <== 1 - bits.out[n];
}

template LessEqThan(n) {
    signal input in[2];
    signal output out;

    component lt = LessThan(n + 1);
    lt.in[0] <== in[0];
    lt.in[1] <== in[1] + 1;
    out <== lt.out;
}

template CoordinateAbsoluteDifference(n) {
    signal input a;
    signal input b;
    signal output diff;

    component comparator = LessThan(n);
    comparator.in[0] <== a;
    comparator.in[1] <== b;

    signal deltaAB;
    signal deltaBA;
    signal chooseAB;
    signal chooseBA;

    deltaAB <== a - b;
    deltaBA <== b - a;
    chooseBA <== comparator.out * deltaBA;
    chooseAB <== (1 - comparator.out) * deltaAB;
    diff <== chooseBA + chooseAB;
}

template ZeroProofProximity() {
    var FIXED_SCALE = 1000000;
    var LATITUDE_OFFSET = 90000000;
    var LONGITUDE_OFFSET = 180000000;

    // Public inputs (Statement binding & Target area)
    signal input targetLat;
    signal input targetLon;
    signal input radiusSquared;
    signal input cosLatScaled;
    signal input contextDigest;
    signal input epoch;
    signal input challengeDigest;

    // Private inputs (User true coordinates)
    signal input userLat;
    signal input userLon;

    // Domain transformation to non-negative range
    signal targetLatShifted;
    signal targetLonShifted;
    signal userLatShifted;
    signal userLonShifted;

    targetLatShifted <== targetLat + LATITUDE_OFFSET;
    targetLonShifted <== targetLon + LONGITUDE_OFFSET;
    userLatShifted <== userLat + LATITUDE_OFFSET;
    userLonShifted <== userLon + LONGITUDE_OFFSET;

    component latBitsTarget = Num2BitsBounded(28);
    component latBitsUser = Num2BitsBounded(28);
    component lonBitsTarget = Num2BitsBounded(29);
    component lonBitsUser = Num2BitsBounded(29);

    latBitsTarget.in <== targetLatShifted;
    latBitsUser.in <== userLatShifted;
    lonBitsTarget.in <== targetLonShifted;
    lonBitsUser.in <== userLonShifted;

    component dLatAbs = CoordinateAbsoluteDifference(29);
    component dLonAbsRaw = CoordinateAbsoluteDifference(30);
    dLatAbs.a <== userLatShifted;
    dLatAbs.b <== targetLatShifted;
    dLonAbsRaw.a <== userLonShifted;
    dLonAbsRaw.b <== targetLonShifted;

    signal dLonAdjusted;
    signal dLonInteger;
    signal dLonRemainder;
    signal dLatSquared;
    signal dLonSquared;
    signal displacementSquared;

    dLonAdjusted <== dLonAbsRaw.diff * cosLatScaled;
    dLonInteger <-- dLonAdjusted \ FIXED_SCALE;
    dLonRemainder <-- dLonAdjusted % FIXED_SCALE;

    // Arithmetic constraint on division and remainder
    dLonInteger * FIXED_SCALE + dLonRemainder === dLonAdjusted;

    component dLonRemainderBits = Num2BitsBounded(20);
    dLonRemainderBits.in <== dLonRemainder;

    component remBound = LessThan(20);
    remBound.in[0] <== dLonRemainder;
    remBound.in[1] <== FIXED_SCALE;
    remBound.out === 1;

    dLatSquared <== dLatAbs.diff * dLatAbs.diff;
    dLonSquared <== dLonInteger * dLonInteger;
    displacementSquared <== dLatSquared + dLonSquared;

    // Bound and verify displacement <= radiusSquared
    component distBits = Num2BitsBounded(64);
    component radiusBits = Num2BitsBounded(64);
    distBits.in <== displacementSquared;
    radiusBits.in <== radiusSquared;

    component withinRadius = LessEqThan(64);
    withinRadius.in[0] <== displacementSquared;
    withinRadius.in[1] <== radiusSquared;

    // Statement binding
    signal statementBinding;
    statementBinding <== contextDigest + epoch + challengeDigest;

    signal output valid;
    valid <== withinRadius.out;
    valid === 1;
}

component main {public [targetLat, targetLon, radiusSquared, cosLatScaled, contextDigest, epoch, challengeDigest]} = ZeroProofProximity();
