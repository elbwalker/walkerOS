#!/bin/bash
set -e

function lint (){
  echo "TODO lint with npm..."
}

function test (){
  echo "npm test"
}

function build (){
  echo "build"
  npm install
  npm run build
}

function push (){
  echo "upload code to s3 bucket"

  echo "build number"
  echo "$GITHUB_RUN_NUMBER"

  aws s3 cp \
    dist/index.js \
    s3://elbwalker-walker/"$ENV"/walker-"$GITHUB_RUN_NUMBER".js

  aws s3 cp \
    dist/index.js \
    s3://elbwalker-walker/"$ENV"/walker.js
}

function build_stage() {
  export ENV=stage

  echo "build for environment ${ENV}"

  build
}

function build_prod() {
  export ENV=prod

  echo "build for environment ${ENV}"

  build
}

function push_stage() {
  export ENV=stage

  echo "push source for environment ${ENV} with GitHub run number ${GITHUB_RUN_NUMBER}"

  push
}

function push_prod() {
  export ENV=prod

  echo "push source for environment ${ENV} with GitHub run number ${GITHUB_RUN_NUMBER}"

  push
}

"$@"
