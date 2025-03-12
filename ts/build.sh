#!/bin/bash

dockerfiles=("Dockerfile.1" "Dockerfile.2" "Dockerfile.3" "Dockerfile.4" "Dockerfile.5" "Dockerfile.6" "Dockerfile.7" "Dockerfile.8")

for dockerfile in "${dockerfiles[@]}"; do
    echo "Building $dockerfile..."

    image_tag="image_${dockerfile,,}"

    { time docker build -f "$dockerfile" -t "$image_tag" .; }

    echo "Finished building $dockerfile"
    echo "-------------------------------------"
done

