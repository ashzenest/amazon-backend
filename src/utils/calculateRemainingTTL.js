const calculateRemainingTTL = (expInUnix) => {
    return expInUnix - Math.floor(Date.now() / 1000)
}

export {calculateRemainingTTL}