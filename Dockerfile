FROM python:3.9.2-alpine

# upgrade pip
RUN pip install --upgrade pip

# get curl for healthchecks
RUN apk add curl

# permissions and nonroot user for tightened security
# RUN adduser -D nonroot
# RUN mkdir /home/app/ && chown -R nonroot:nonroot /home/app
# RUN mkdir -p /var/log/flask-app && touch /var/log/flask-app/flask-app.err.log && touch /var/log/flask-app/flask-app.out.log
# RUN chown -R nonroot:nonroot /var/log/flask-app
# USER nonroot

# copy all the files to the container
RUN mkdir /app

COPY . /app
RUN ls
WORKDIR /app
RUN ls

# python setup
# RUN python -m venv venv
ENV PATH="venv/bin:$PATH"
RUN export FLASK_APP=app.py
RUN pip install -r requirements.txt

# define the port number the container should expose
EXPOSE 5000

CMD ["python", "app.py"]