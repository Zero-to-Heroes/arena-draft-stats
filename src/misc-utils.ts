// The date of the day before, in YYYY-MM-dd format
export const yesterdayDate = () => {
	const now = new Date();
	const yesterday = new Date(now.setDate(now.getDate() - 1));
	yesterday.setHours(0);
	yesterday.setMinutes(0);
	yesterday.setSeconds(0);
	yesterday.setMilliseconds(0);
	return yesterday.toISOString();
};

export type Mutable<T> = {
	-readonly [P in keyof T]: T[P];
};
