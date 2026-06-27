import uuid

from app.models.user import User

from app.core.security import hash_password, verify_password, create_access_token


def create_user(db, user):
    new_user = User(
        id=str(uuid.uuid4()), email=user.email, password=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()

    return {"message": "created"}


def authenticate_user(db, user):

    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:

        return {"error": "invalid user"}

    if not verify_password(user.password, db_user.password):

        return {"error": "invalid password"}

    token = create_access_token({"sub": db_user.id})

    return {"access_token": token}
