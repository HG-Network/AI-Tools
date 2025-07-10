FROM openjdk:11-jdk-slim

# Install dependencies
RUN apt-get update && apt-get install -y unzip wget curl git build-essential

# Install Gradle
RUN wget https://services.gradle.org/distributions/gradle-7.4.2-bin.zip -P /tmp && \
    unzip -d /opt/gradle /tmp/gradle-7.4.2-bin.zip && \
    ln -s /opt/gradle/gradle-7.4.2/bin/gradle /usr/bin/gradle

ENV GRADLE_HOME=/opt/gradle/gradle-7.4.2
ENV PATH=$PATH:$GRADLE_HOME/bin

# Set work directory
WORKDIR /app

# Copy backend source
COPY . .

# Install Node.js dependencies
RUN apt-get install -y nodejs npm && npm install

EXPOSE 3000
CMD ["node", "server.js"]
