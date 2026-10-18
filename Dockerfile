FROM mcr.microsoft.com/playwright:v1.63.0-noble

USER root
WORKDIR /app

COPY package.json package-lock.json ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p /app/data /app/results \
    && chmod +x /app/scripts/docker-entrypoint.sh \
    && chown -R pwuser:pwuser /app

USER pwuser
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
