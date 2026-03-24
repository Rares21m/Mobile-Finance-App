class CircuitBreaker {
  constructor({ failureThreshold = 5, resetTimeoutMs = 30000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.state = "CLOSED";
    this.failureCount = 0;
    this.openedAt = null;
  }

  canRequest() {
    if (this.state === "CLOSED") {
      return true;
    }

    if (this.state === "OPEN") {
      if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        return true;
      }
      return false;
    }

    return true;
  }

  markSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
    this.openedAt = null;
  }

  markFailure() {
    this.failureCount += 1;

    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.openedAt = Date.now();
    }
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      resetTimeoutMs: this.resetTimeoutMs,
      openedAt: this.openedAt
    };
  }
}

module.exports = CircuitBreaker;