pipeline { agent any

environment {
    DOCKER_IMAGE = 'rakiloki/sample-app'
    DOCKER_TAG = 'latest'
    DOCKERHUB_CREDENTIALS = 'dockerhub-creds'
}

stages {
    stage('Checkout') {
        steps {
            echo 'Downloading source code from GitHub'
            checkout scm
        }
    }

    stage('Build Docker Image') {
        steps {
            echo 'Building the application Docker image'
            sh 'docker build -t $DOCKER_IMAGE:$DOCKER_TAG .'
        }
    }

    stage('Push to Docker Hub') {
        steps {
            echo 'Logging in and pushing image to Docker Hub'

            withCredentials([
                usernamePassword(
                    credentialsId: "${DOCKERHUB_CREDENTIALS}",
                    usernameVariable: 'DOCKERHUB_USER',
                    passwordVariable: 'DOCKERHUB_TOKEN'
                )
            ]) {
                sh '''
                    set +x
                    echo "$DOCKERHUB_TOKEN" | docker login \
                        --username "$DOCKERHUB_USER" \
                        --password-stdin

                    docker push "$DOCKER_IMAGE:$DOCKER_TAG"
                    docker logout
                '''
            }
        }
    }

    stage('Deploy Container') {
        steps {
            echo 'Deploying the application container'

            sh '''
                docker pull "$DOCKER_IMAGE:$DOCKER_TAG"

                docker rm -f sample-app-container 2>/dev/null || true

                docker run -d \
                    --name sample-app-container \
                    --restart unless-stopped \
                    -p 8081:80 \
                    "$DOCKER_IMAGE:$DOCKER_TAG"
            '''
        }
    }
}

post {
    success {
        echo 'SUCCESS: Image pushed and application deployed!'
        echo 'Website: http://localhost:8081'
    }

    failure {
        echo 'Pipeline failed. Check the Jenkins console output.'
    }
}


}
