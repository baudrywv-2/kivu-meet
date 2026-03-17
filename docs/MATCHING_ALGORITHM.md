# Matching Algorithm

## Formula

```
MatchScore = 0.35 × CompatibilityScore
          + 0.20 × ConversationProbability
          + 0.15 × ActivityScore
          + 0.15 × DistanceScore
          + 0.10 × ProfileQuality
          + 0.05 × PopularityBalance
```

All scores are normalized to 0–1.

---

## 1. CompatibilityScore (35%)

**Shared interests + relationship goals alignment**

- Count overlapping items in `interests[]` arrays
- If relationship_goal matches: +0.3
- Formula: `min(1, (shared_interests / max_interests_in_pair) * 0.7 + goal_match * 0.3)`

---

## 2. ConversationProbability (20%)

**Likelihood two users will start chatting**

- User A’s historical reply rate (messages sent / matches)
- User B’s historical reply rate
- Combined: `(reply_rate_A + reply_rate_B) / 2`
- New users (no history): default 0.5

---

## 3. ActivityScore (15%)

**Recency and consistency of activity**

- Last login / last swipe / last message
- Score decays over time: `exp(-days_since_active / 7)`
- More recent = higher score

---

## 4. DistanceScore (15%)

**Prioritize nearby users**

- Haversine distance between (lat, lng)
- Normalize: `max(0, 1 - distance_km / max_radius_km)`
- e.g. max_radius = 50km, distance 10km → score ≈ 0.8

---

## 5. ProfileQuality (10%)

**Reward complete profiles**

- Photo: 0.25
- Bio (length): 0.2
- Interests (count): 0.2
- Voice intro: 0.2
- Age, city: 0.15
- Sum components, cap at 1

---

## 6. PopularityBalance (5%)

**Give new users exposure**

- Inverse of “likes received” count
- `1 / (1 + log(1 + likes_received))`
- New users get ~1.0; very popular users get lower
