"""
Worklog Matching Algorithms

This module contains different algorithms for matching worklogs across
complementary JIRA instances. Each algorithm can be enabled/disabled
via settings.
"""

import re
from collections import defaultdict
from typing import List, Dict, Set, Any, Optional
from dataclasses import dataclass


def _matches_exclusion_pattern(linking_key: str, exclusions: List[str]) -> bool:
    """
    Check if linking_key matches any exclusion pattern.

    Supports wildcard patterns:
    - 'ASS-*' matches 'ASS-19', 'ASS-2', 'ASS-9999', etc.
    - 'FORM-*' matches 'FORM-10', 'FORM-123', etc.
    - 'ADMIN' matches exactly 'ADMIN' (no wildcard)

    Args:
        linking_key: The key to check (e.g., 'ASS-19')
        exclusions: List of exclusion patterns (e.g., ['ASS-*', 'FORM-*', 'ADMIN'])

    Returns:
        True if linking_key matches any exclusion pattern
    """
    if not exclusions:
        return False

    for pattern in exclusions:
        if '*' in pattern:
            # Convert wildcard pattern to regex
            # 'ASS-*' -> '^ASS-.*$'
            regex_pattern = pattern.replace('*', '.*')
            if re.match(f'^{regex_pattern}$', linking_key):
                return True
        else:
            # Exact match
            if linking_key == pattern:
                return True

    return False


@dataclass
class WorklogGroup:
    """Represents a group of matched worklogs across instances."""
    linking_key: str
    primary_worklogs: List[Any]
    secondary_worklogs: List[Any]
    primary_hours: float
    secondary_hours: float
    delta: float
    primary_issues: List[str]
    secondary_issues: List[str]
    is_excluded: bool = False  # True if this group is in exclusion list


class MatchingAlgorithm:
    """Base class for worklog matching algorithms."""

    algorithm_type: str = None
    algorithm_name: str = None
    description: str = None

    def find_groups(
        self,
        primary_worklogs: List[Any],
        secondary_worklogs: List[Any],
        config: Dict[str, Any] = None,
        exclusions: List[str] = None
    ) -> Dict[str, WorklogGroup]:
        """
        Find groups of related worklogs across instances.

        Args:
            primary_worklogs: Worklogs from primary instance
            secondary_worklogs: Worklogs from secondary instance
            config: Algorithm-specific configuration

        Returns:
            Dictionary mapping linking_key -> WorklogGroup
        """
        raise NotImplementedError


class ParentLinkingMatcher(MatchingAlgorithm):
    """
    Parent Linking Match Algorithm

    Groups worklogs by parent Epic/Project key found in:
    1. Direct parent_key field
    2. Linking key pattern (PROJ-123) in issue_summary

    Example:
        - DLWMS-866 has parent_key = "DLREQ-1447" (MMFG instance)
        - SYSMMFG-5349 has "DLREQ-1447" in issue_summary (OT instance)
        → Both belong to group "DLREQ-1447"
        → Aggregate hours are compared
    """

    algorithm_type = "parent_linking"
    algorithm_name = "Parent Linking Match"
    description = (
        "Groups worklogs by parent Epic/Project key. "
        "Matches issues that share the same parent or have parent key in summary. "
        "Compares aggregated hours per group instead of individual issues."
    )

    def find_groups(
        self,
        primary_worklogs: List[Any],
        secondary_worklogs: List[Any],
        config: Dict[str, Any] = None,
        exclusions: List[str] = None
    ) -> Dict[str, WorklogGroup]:
        """Find groups based on parent linking keys."""
        config = config or {}
        exclusions = exclusions or []

        # Build groups
        groups = defaultdict(lambda: {
            'primary': [],
            'secondary': []
        })

        # Process primary worklogs
        for wl in primary_worklogs:
            linking_key = self._extract_linking_key(wl)
            if linking_key:
                groups[linking_key]['primary'].append(wl)

        # Process secondary worklogs
        for wl in secondary_worklogs:
            linking_key = self._extract_linking_key(wl)
            if linking_key:
                groups[linking_key]['secondary'].append(wl)

        # Build WorklogGroup objects
        result = {}
        for linking_key, group_data in groups.items():
            primary_wls = group_data['primary']
            secondary_wls = group_data['secondary']

            # Calculate hours (0 if no worklogs on that side)
            primary_hours = sum(wl.time_spent_seconds for wl in primary_wls) / 3600 if primary_wls else 0
            secondary_hours = sum(wl.time_spent_seconds for wl in secondary_wls) / 3600 if secondary_wls else 0
            delta = primary_hours - secondary_hours

            # Check if this group is excluded (expected discrepancy like leaves, training)
            is_excluded = _matches_exclusion_pattern(linking_key, exclusions)

            # Include ALL groups, even if only on one side (solitaries are discrepancies)
            result[linking_key] = WorklogGroup(
                linking_key=linking_key,
                primary_worklogs=primary_wls,
                secondary_worklogs=secondary_wls,
                primary_hours=primary_hours,
                secondary_hours=secondary_hours,
                delta=delta,
                primary_issues=list(set(wl.issue_key for wl in primary_wls)) if primary_wls else [],
                secondary_issues=list(set(wl.issue_key for wl in secondary_wls)) if secondary_wls else [],
                is_excluded=is_excluded
            )

        return result

    def _extract_linking_key(self, worklog: Any) -> Optional[str]:
        """
        Extract linking key with priority: direct > title > parent.

        Sequential logic:
        1. DIRECT: use issue_key if it matches PROJ-123 pattern
        2. TITLE (issue_summary): extract first PROJ-123 pattern
        3. TITLE (parent_name): extract first PROJ-123 from parent name
        4. PARENT: use parent_key as direct fallback
        """
        issue_pattern = r'[A-Z][A-Z0-9]+-\d+'

        # 1. DIRECT: use issue_key if valid (PROJ-123)
        if hasattr(worklog, 'issue_key') and worklog.issue_key:
            if re.match(f'^{issue_pattern}$', worklog.issue_key):
                return worklog.issue_key

        # 2. TITLE (summary): extract first PROJ-123 pattern
        if hasattr(worklog, 'issue_summary') and worklog.issue_summary:
            matches = re.findall(issue_pattern, worklog.issue_summary)
            if matches:
                return matches[0]

        # 3. TITLE (parent_name): extract from parent name
        if hasattr(worklog, 'parent_name') and worklog.parent_name:
            matches = re.findall(issue_pattern, worklog.parent_name)
            if matches:
                return matches[0]

        # 4. PARENT: use parent_key directly
        if hasattr(worklog, 'parent_key') and worklog.parent_key:
            return worklog.parent_key

        return None


# Registry of available algorithms
AVAILABLE_ALGORITHMS = [
    ParentLinkingMatcher,
    # Future algorithms will be added here:
    # SummaryKeywordMatcher,
    # CustomFieldMatcher,
    # etc.
]


def get_algorithm(algorithm_type: str) -> Optional[MatchingAlgorithm]:
    """Get algorithm instance by type."""
    for algo_class in AVAILABLE_ALGORITHMS:
        if algo_class.algorithm_type == algorithm_type:
            return algo_class()
    return None


def get_available_algorithms() -> List[Dict[str, str]]:
    """Get list of available algorithms with metadata."""
    return [
        {
            'algorithm_type': algo.algorithm_type,
            'algorithm_name': algo.algorithm_name,
            'description': algo.description,
        }
        for algo in AVAILABLE_ALGORITHMS
    ]


def apply_generic_issues(
    matched_groups: Dict[str, WorklogGroup],
    generic_issues: List[Dict[str, Any]],
    primary_worklogs: List[Any],
    secondary_worklogs: List[Any],
    user_to_team: Dict[str, int]
) -> Dict[str, WorklogGroup]:
    """
    Apply generic issue matching after standard algorithm matching.

    Generic issues are "container" issues that collect worklogs of a specific
    issue_type. For example, SYSMMFG-3658 collects all "Incident" worklogs.

    Args:
        matched_groups: Existing matched groups from standard algorithm
        generic_issues: List of generic issue configs from DB
            Each has: issue_code, issue_type, team_id (nullable), description
        primary_worklogs: All primary instance worklogs
        secondary_worklogs: All secondary instance worklogs
        user_to_team: Mapping of email (lowercase) -> team_id

    Returns:
        Updated matched_groups dict with generic issue groups added
    """
    if not generic_issues:
        return matched_groups

    # Collect IDs of worklogs already matched to avoid double-counting
    matched_primary_ids: Set[Any] = set()
    matched_secondary_ids: Set[Any] = set()
    for group in matched_groups.values():
        for wl in group.primary_worklogs:
            matched_primary_ids.add(id(wl))
        for wl in group.secondary_worklogs:
            matched_secondary_ids.add(id(wl))

    # Separate team-specific rules from global (team_id=None) rules
    # Team-specific rules take priority over global ones
    team_specific = [gi for gi in generic_issues if gi.get('team_id') is not None]
    global_rules = [gi for gi in generic_issues if gi.get('team_id') is None]

    # Track secondary worklogs claimed by team-specific rules
    claimed_secondary_ids: Set[Any] = set()

    # Process team-specific rules first (they take priority)
    for gi in team_specific:
        _apply_single_generic_issue(
            gi, matched_groups, primary_worklogs, secondary_worklogs,
            user_to_team, matched_primary_ids, matched_secondary_ids,
            claimed_secondary_ids, team_filter=gi['team_id']
        )

    # Process global rules (only for unclaimed worklogs)
    for gi in global_rules:
        _apply_single_generic_issue(
            gi, matched_groups, primary_worklogs, secondary_worklogs,
            user_to_team, matched_primary_ids, matched_secondary_ids,
            claimed_secondary_ids, team_filter=None
        )

    return matched_groups


def _apply_single_generic_issue(
    gi: Dict[str, Any],
    matched_groups: Dict[str, WorklogGroup],
    primary_worklogs: List[Any],
    secondary_worklogs: List[Any],
    user_to_team: Dict[str, int],
    matched_primary_ids: Set[Any],
    matched_secondary_ids: Set[Any],
    claimed_secondary_ids: Set[Any],
    team_filter: Optional[int]
) -> None:
    """Apply a single generic issue rule, mutating matched_groups in place."""
    issue_code = gi['issue_code']
    issue_type_config = gi['issue_type']

    # Support multiple issue types separated by comma (e.g., "Incident,Request,Bug")
    allowed_types = [t.strip() for t in issue_type_config.split(',')]

    # Find primary worklogs on the container issue (not already matched)
    primary_matches = []
    for wl in primary_worklogs:
        if id(wl) in matched_primary_ids:
            continue
        if not hasattr(wl, 'issue_key') or wl.issue_key != issue_code:
            continue
        # Apply team filter if set
        if team_filter is not None:
            email = getattr(wl, 'author_email', '').lower()
            if user_to_team.get(email) != team_filter:
                continue
        primary_matches.append(wl)

    # Find secondary worklogs with matching issue_type (not already matched or claimed)
    secondary_matches = []
    for wl in secondary_worklogs:
        if id(wl) in matched_secondary_ids:
            continue
        if id(wl) in claimed_secondary_ids:
            continue
        # Check if worklog's issue_type matches any of the allowed types
        if not hasattr(wl, 'issue_type') or not wl.issue_type:
            continue
        if wl.issue_type.strip() not in allowed_types:
            continue
        # Apply team filter if set
        if team_filter is not None:
            email = getattr(wl, 'author_email', '').lower()
            if user_to_team.get(email) != team_filter:
                continue
        secondary_matches.append(wl)

    # Only create group if at least one side has worklogs
    if not primary_matches and not secondary_matches:
        return

    # Mark these worklogs as matched/claimed
    for wl in primary_matches:
        matched_primary_ids.add(id(wl))
    for wl in secondary_matches:
        matched_secondary_ids.add(id(wl))
        claimed_secondary_ids.add(id(wl))

    # Build the group
    linking_key = f"GENERIC_{issue_code}_{issue_type_config.replace(',', '_')}"
    primary_hours = sum(wl.time_spent_seconds for wl in primary_matches) / 3600 if primary_matches else 0
    secondary_hours = sum(wl.time_spent_seconds for wl in secondary_matches) / 3600 if secondary_matches else 0

    matched_groups[linking_key] = WorklogGroup(
        linking_key=linking_key,
        primary_worklogs=primary_matches,
        secondary_worklogs=secondary_matches,
        primary_hours=primary_hours,
        secondary_hours=secondary_hours,
        delta=primary_hours - secondary_hours,
        primary_issues=list(set(wl.issue_key for wl in primary_matches)) if primary_matches else [],
        secondary_issues=list(set(wl.issue_key for wl in secondary_matches)) if secondary_matches else [],
        is_excluded=False
    )
