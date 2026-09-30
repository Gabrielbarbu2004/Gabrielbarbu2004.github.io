# Barbu Robotics

Service website for Gabriel Barbu's independent automation and robotics work.

Live website: https://gabrielbarbu2004.github.io/

The homepage introduces workflow automation, computer vision, robotics prototyping and engineering tools. It includes three runnable independent demos, three academic project case studies, and four interactive engineering tools.

## Development

This repository contains static HTML, CSS and browser JavaScript. No build step or package installation is required. Run `python -m http.server 8000` in the repository, then open http://localhost:8000.

Edit the HTML and stylesheet files directly. Demo engines and tests are under `demos/`. The individual projects are also available at https://github.com/Gabrielbarbu2004/barbu-robotics-automation-labs.

## Deployment

GitHub Pages serves the `main` branch from the repository root. `.nojekyll` preserves the static assets without a Jekyll build. Canonical URLs, the sitemap and robots.txt point to the free GitHub Pages origin.

## Evidence and scope

The three demonstration engines pass 32 tests in total. Each demo explains its assumptions and limitations. They use fictional or synthetic inputs and do not represent commissioned client systems. Academic case studies describe the existing engineering projects separately.
