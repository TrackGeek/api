<div align="center">
    <img src="https://github.com/TrackGeek.png?size=2048" width="128px" style="max-width:100%;">
    <h3 style="font-size: 2rem; margin-bottom: 0">PR Guidelines</h3>
    <h4 style="margin-top: 0">Revision 1.1</h4>
    <br />
</div>

# Guidelines

When publishing PR to this GitHub, we require you to follow a set of guidelines. To some, these strict rules may seem harsh. However, the implementation of these rulesets will keep us and the users from running into any issues.

# Creation

> The code you write **must** be _well-written_ and **must** be _readable_ and all strings must be grammatically correct.

> Each PR follows a strict linting ruleset which will be checked during the review process. A couple of recommendations can be seen below. [Biome](https://biomejs.dev/).

Here is a list of rules you must follow when writing your code:

- All assets **must** have a good resolution (min. 1024px height). You can upsize it using a tool like [waifu2x](http://waifu2x.udp.jp/).
- It is **forbidden** to code without adding support to its primary language (for e.g., a settings page coded with support only for Portuguese and Japanese, but not English itself.)
- Features which contain some explicit content should avoid displaying it. For example, use generic text or blur images when explicit content or media are available.
- If the feature is very complex, consider separating the code into multiple files.
- Features that use buttons should follow extra requirements:
  - Promoting websites by them is prohibited.
  - They can't display information you couldn't fit in other fields.
  - Redirecting directly to audio/video stream is prohibited.

## Modification

In some situations, activities may behave unexpectedly or could use some minor changes to improve their functionality. Here is a list of rules that you **must** follow while modifiying activities.

- If you make modifications to a activity and change at least a **quarter** of the activity's codebase, you are allowed to add yourself as a contributor. Contact a reviewer for more information about this subject.
- Anyone may create PRs to fix bugs. Do **not** change images if they are not outdated and are in specifications.

# Verification

> **All** code contributed will be licensed under the `GNU GPL 3`.

> If you need to contact someone, please use our official Discord server. All reviewers will have the `Tracker Dev` role on their profile.

> Please keep in mind that the reviewers work voluntarily and manage other repositories in addition to this one, your pull request may not get reviewed until hours or even days after it has been created.

> **Always** have an up-to-date fork before creating your pull request. This will help limit false positives from the checks.

The most important process of activity development is getting your activity on the store. This is done by making a [pull request](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request) on GitHub on the `TrackGeek/TrackGeek` repository. Our reviewers will confirm that your activity is up to standards and will push it onto the store.

<div>
  <h2 style="font-size: 2rem; margin-bottom: 0;">Reviewers</h2>
  <a href="https://github.com/izakdvlpr"><img src="https://github.com/izakdvlpr.png?size=2048" title="izakdvlpr" width="48px" style="max-width:100%; border-radius: 50%;"/></a> <a href="https://github.com/Kuriel23"><img src="https://github.com/Kuriel23.png?size=2048" title="Kuriel23" width="48px" style="max-width:100%; border-radius: 50%;"/></a>
  <br />
</div>

## `Restrictions`

Repetitive offenses such as breaking guidelines, spamming pull requests, threats, or innapropriate behavior will get you banned from creating activities.

In this scenario, the following changes will occur:

- PR under your management will be transferred to the TrackGeek bot or another user (reviewer decision).
- All of your issues and pull requests (activity creation, activity contribution, etc) created following the ban will be prompty closed.
- Tickets created under your name regarding activity development will be deleted.

## `Reviewing`

A few things you should know after opening a pull request:

- It takes 2 reviewers to merge a pull request.
- If a pull request is inactive for a period of 7 days, it will be promptly closed.
- All checks **must** be passed in order to merge.
- ⚠️ You **must** provide new, unaltered screenshots or recordings (taken by you) showing the new changes to prove that your PR works. _You are allowed to stitch screenshots together for viewing pleasure_ This applies for both creation and modification.

## `Checks`

Currently, a activity goes through 2 separate stages of checks. All of these checks help the reviewers determine whether your activity is suitable for deployment.

- `DeepScan` is a bot that checks for code quality. If you ever receive errors for new issues, you are **required** to fix them. _Warning: DeepScan doesn't always give you errors. Please look at CodeFactor warnings instead._
- `Compile and Lint` checks for code quality. If you ever receive errors for new issues, you are **required** to fix them.

# Suggestions

If you have some suggestions about our guidelines, you should contact us @ [TrackGeek's Discord server](https://discord.trackgeek.app) and we will check them!

# Contributions

`Revision 1` was maintained by the following individuals:

<div>
<a href="https://github.com/Kuriel23"><img src="https://github.com/Kuriel23.png?size=2048" width="48px" style="max-width:100%; border-radius: 50%;"/></a>
</div>
